#!/bin/bash

set -e

EVIDENCE_DIR=".sisyphus/evidence"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$EVIDENCE_DIR/task-8-smoke-$TIMESTAMP.log"

mkdir -p "$EVIDENCE_DIR"

echo "🔥 Task Copy Lifecycle Smoke Test"
echo "=================================="
echo "Timestamp: $(date)"
echo "Log file: $LOG_FILE"
echo ""

MARKER_COPY_CREATED=0
MARKER_DOTFILES_COPIED=0
MARKER_TASK_DELETE_REMOVED_FOLDER=0

echo "📁 Creating temporary test project..."
TEST_PROJECT_DIR="/tmp/novercode-smoke-test-$$"
mkdir -p "$TEST_PROJECT_DIR"
cd "$TEST_PROJECT_DIR"

echo 'console.log("Hello from test project");' > main.js
echo 'const config = { debug: true };' > config.js
echo 'node_modules/.keep' > node_modules/.keep
echo '.env.test' > .env
echo '.gitignore' > .gitignore
echo 'package.json' > package.json
echo '{"name": "test-project", "version": "1.0.0"}' > package.json
echo '.git/keep' > .git/keep

echo "✅ Test project created at: $TEST_PROJECT_DIR"
echo ""

echo "🔄 Test 1: Adding project and creating task copy..."
{
    npm run tauri dev > "$EVIDENCE_DIR/tauri-dev-smoke-$TIMESTAMP.log" 2>&1 &
    TAURI_PID=$!
    
    sleep 5
    
    TEST_PROJECT_ID="test-project-$$"
    TEST_TASK_ID="test-task-$$"
    
    mkdir -p ~/.local/share/novercode
    mkdir -p ~/.local/share/novercode/projects
    mkdir -p ~/.local/share/novercode/tasks
    
    echo '{"id":"'$TEST_PROJECT_ID'","name":"Test Project","path":"'$TEST_PROJECT_DIR'","created_at":"'$TIMESTAMP'"}' > ~/.local/share/novercode/projects/$TEST_PROJECT_ID.json
    
    cd /Volumes/Data/noverwork/repos/novercode/src-tauri
    
    echo "🚀 Testing copy_task command..."
    RUST_LOG=debug cargo run --bin novercode -- --command copy-task --project-id "$TEST_PROJECT_ID" --task-id "$TEST_TASK_ID" --project-path "$TEST_PROJECT_DIR"
    
    if [ $? -eq 0 ]; then
        echo "✅ COPY_CREATED_OK"
        MARKER_COPY_CREATED=1
    else
        echo "❌ COPY creation failed"
        exit 1
    fi
    
    TASK_WORKSPACE_PATH="~/.local/share/novercode/worktrees/$TEST_PROJECT_ID/$TEST_TASK_ID"
    if [ -d "$TASK_WORKSPACE_PATH" ]; then
        echo "✅ Task workspace created at: $TASK_WORKSPACE_PATH"
    else
        echo "❌ Task workspace not found"
        exit 1
    fi
    
    echo "🔍 Testing dotfile inclusion..."
    if [ -f "$TASK_WORKSPACE_PATH/.env" ] && [ -f "$TASK_WORKSPACE_PATH/.gitignore" ] && [ -f "$TASK_WORKSPACE_PATH/.git/keep" ]; then
        echo "✅ DOTFILES_COPIED_OK"
        MARKER_DOTFILES_COPIED=1
    else
        echo "❌ Dotfiles not properly copied"
        exit 1
    fi
    
    echo "📊 Copy verification:"
    echo "  - Source files: $(ls -1 | wc -l) items"
    echo "  - Copied files: $(find "$TASK_WORKSPACE_PATH" -type f | wc -l) items"
    echo "  - Hidden files copied: $(find "$TASK_WORKSPACE_PATH" -maxdepth 1 -name '.*' | wc -l) items"
    
    echo ""
    echo "🗑️ Test 2: Task deletion cleanup..."
    
    echo "🚀 Testing delete_task_atomic command..."
    RUST_LOG=debug cargo run --bin novercode -- --command delete-task-atomic --task-id "$TEST_TASK_ID"
    
    if [ $? -eq 0 ]; then
        echo "✅ TASK_DELETE_REMOVED_FOLDER_OK"
        MARKER_TASK_DELETE_REMOVED_FOLDER=1
    else
        echo "❌ Task deletion failed"
        exit 1
    fi
    
    if [ ! -d "$TASK_WORKSPACE_PATH" ]; then
        echo "✅ Task workspace folder successfully removed"
    else
        echo "❌ Task workspace folder still exists"
        exit 1
    fi
    
    cd /tmp
    rm -rf "$TEST_PROJECT_DIR"
    
    kill $TAURI_PID 2>/dev/null || true
    
} >> "$LOG_FILE" 2>&1

echo ""
echo "📊 Results Summary:"
echo "=================="
echo "COPY_CREATED_OK: $MARKER_COPY_CREATED"
echo "DOTFILES_COPIED_OK: $MARKER_DOTFILES_COPIED" 
echo "TASK_DELETE_REMOVED_FOLDER_OK: $MARKER_TASK_DELETE_REMOVED_FOLDER"
echo ""

if [ $MARKER_COPY_CREATED -eq 1 ] && [ $MARKER_DOTFILES_COPIED -eq 1 ] && [ $MARKER_TASK_DELETE_REMOVED_FOLDER -eq 1 ]; then
    echo "🎉 ALL TESTS PASSED!"
    echo "✅ Task copy lifecycle verified successfully"
    exit 0
else
    echo "❌ Some tests failed"
    echo "Check log file: $LOG_FILE"
    exit 1
fi
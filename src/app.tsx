import { Board } from '@/components/kanban/board';
import { VoiceInputProvider } from '@/contexts/voice-input-provider';
import { UpdateProvider } from '@/stores/update';

function App() {
  return (
    <UpdateProvider>
      <VoiceInputProvider>
        <Board />
      </VoiceInputProvider>
    </UpdateProvider>
  );
}

export default App;

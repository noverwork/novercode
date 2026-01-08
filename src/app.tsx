import { Board } from "@/components/kanban/board";
import { UpdateProvider } from "@/stores/update";

function App() {
  return (
    <UpdateProvider>
      <Board />
    </UpdateProvider>
  );
}

export default App;

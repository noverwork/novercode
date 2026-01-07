import { Board } from "@/components/kanban/Board";
import { UpdateProvider } from "@/stores/update";

function App() {
  return (
    <UpdateProvider>
      <Board />
    </UpdateProvider>
  );
}

export default App;

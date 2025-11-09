import "./App.css";
import AppRouter from "./AppRouter";
import "./App.css";
import { Provider } from "react-redux";
import { store } from "./redux/store";

function App() {
  return (
    <Provider store={store}>
      <div className="App" style={{ width: "100vw", height: "100vh" }}>
        <AppRouter />
      </div>
    </Provider>
  );
}

export default App;

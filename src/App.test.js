import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import App from "./App.jsx";
import store from "./app/store";

test("renders admin login", () => {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    </Provider>
  );
  expect(screen.getByRole("heading", { name: /login/i })).toBeInTheDocument();
});

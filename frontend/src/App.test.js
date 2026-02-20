import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('@codesandbox/sandpack-react', () => ({
  Sandpack: () => <div>Sandpack</div>,
  SandpackProvider: ({ children }) => <div>{children}</div>,
  SandpackLayout: ({ children }) => <div>{children}</div>,
  SandpackCodeEditor: () => <div>Code Editor</div>,
  SandpackPreview: () => <div>Preview</div>
}));

test('renders app title', () => {
  render(<App />);
  const titleElements = screen.getAllByText(/MiniCodeHub/i);
  expect(titleElements.length).toBeGreaterThan(0);
});

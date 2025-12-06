import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import HomeScreen from '../src/screens/HomeScreen.jsx';

describe('HomeScreen', () => {
  it('renders title and buttons disabled appropriately', () => {
    const noop = () => {};
    render(<HomeScreen onJoin={noop} onCreate={noop} screenName="" setScreenName={noop} prefilledCode={null} />);
    expect(screen.getByAltText(/QuackKing logo/i)).toBeInTheDocument();
    const joinBtn = screen.getByText('Join');
    expect(joinBtn).toBeDisabled();
    const createBtn = screen.getByText('Create Game');
    expect(createBtn).toBeDisabled();
  });

  it('shows a resume prompt when a cached host game is present', () => {
    const onResume = vi.fn();
    const noop = () => {};

    render(
      <HomeScreen
        onJoin={noop}
        onCreate={noop}
        screenName=""
        setScreenName={noop}
        prefilledCode={null}
        resumeGameCode="ABCD"
        onResumeGame={onResume}
      />
    );

    const resumeButton = screen.getByRole('button', { name: /resume game abcd/i });
    expect(resumeButton).toBeInTheDocument();
    fireEvent.click(resumeButton);
    expect(onResume).toHaveBeenCalled();
  });

  it('prefills the name from a pending resume session', async () => {
    const Wrapper = (props) => {
      const [name, setName] = React.useState('');
      return <HomeScreen {...props} screenName={name} setScreenName={setName} />;
    };

    render(
      <Wrapper
        onJoin={() => {}}
        onCreate={() => {}}
        prefilledCode={null}
        resumeGameCode="ABCD"
        resumeScreenName="Hosty"
      />
    );

    expect(await screen.findByDisplayValue('Hosty')).toBeInTheDocument();
  });
});

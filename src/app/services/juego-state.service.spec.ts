import { buildMapping } from './juego-state.service';
import { GameTrack } from '../models/juego.models';

function track(name: string): GameTrack {
  return { name, artist: 'Artist', uri: `spotify:track:${name}`, image: '' };
}

describe('buildMapping', () => {
  it('assigns numbers 1..90 exactly once', () => {
    const mapping = buildMapping([track('a'), track('b')]);
    const numbers = mapping.map((m) => m.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
  });

  it('assigns every track to exactly one number, leaving the rest as comodín', () => {
    const tracks = [track('a'), track('b'), track('c')];
    const mapping = buildMapping(tracks);
    const assigned = mapping.filter((m) => m.track !== null);
    expect(assigned).toHaveLength(3);
    expect(assigned.map((m) => m.track!.name).sort()).toEqual(['a', 'b', 'c']);
    expect(mapping.filter((m) => m.track === null)).toHaveLength(87);
  });

  it('caps assigned tracks at 90 when there are more', () => {
    const tracks = Array.from({ length: 120 }, (_, i) => track(`t${i}`));
    const mapping = buildMapping(tracks);
    expect(mapping.filter((m) => m.track !== null)).toHaveLength(90);
  });
});

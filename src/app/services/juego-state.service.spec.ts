import { buildMapping, allSongsPlayable } from './juego-state.service';
import { Song } from '../models/bingo.models';

function song(number: number, spotifyId?: string): Song {
  return { number, title: `Track ${number} - Artist ${number}`, spotifyId, image: spotifyId ? 'img' : undefined };
}

describe('buildMapping', () => {
  it('maps each song directly onto its own number, in order and any size', () => {
    const songs = [song(1, 'a'), song(2, 'b'), song(3, 'c')];
    const mapping = buildMapping(songs);
    expect(mapping.map((m) => m.number)).toEqual([1, 2, 3]);
    expect(mapping.every((m) => m.track !== null)).toBe(true);
  });

  it('splits "Track - Artist" into separate name and artist fields', () => {
    const mapping = buildMapping([song(1, 'a')]);
    expect(mapping[0].track).toEqual({ name: 'Track 1', artist: 'Artist 1', spotifyId: 'a', image: 'img' });
  });

  it('leaves songs without a spotifyId as a comodín (no track)', () => {
    const mapping = buildMapping([song(1, undefined)]);
    expect(mapping[0].track).toBeNull();
  });
});

describe('allSongsPlayable', () => {
  it('is true only when every song has a spotifyId', () => {
    expect(allSongsPlayable([song(1, 'a'), song(2, 'b')])).toBe(true);
    expect(allSongsPlayable([song(1, 'a'), song(2, undefined)])).toBe(false);
    expect(allSongsPlayable([])).toBe(false);
  });
});

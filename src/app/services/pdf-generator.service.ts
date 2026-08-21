import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { BingoCard, BingoCell, Song } from '../models/bingo.models';
import { splitSongTitle } from '../utils/song-title.util';

const PAGE_MM = { portrait: { w: 210, h: 297 }, landscape: { w: 297, h: 210 } };
const MARGIN = 10;
const GAP = 4;
const HEADER_H = 5;
const CARDS_PER_ROW = 3;
const CARDS_PER_COL = 3;
const MM_PER_PT = 25.4 / 72; // jsPDF setFontSize takes points; doc unit here is mm.
const LINE_HEIGHT = 1.15;

const ACCENT: [number, number, number] = [109, 40, 217];
const HEADER_BG: [number, number, number] = [237, 233, 254];
const BORDER: [number, number, number] = [180, 170, 220];
const GRID_LINE: [number, number, number] = [210, 210, 220];
const ALT_ROW: [number, number, number] = [248, 246, 253];
const TEXT_DARK: [number, number, number] = [31, 34, 48];
const TEXT_MUTED: [number, number, number] = [110, 110, 120];

@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {
  download(cards: BingoCard[], rows: number, columns: number, gameName = ''): void {
    if (cards.length === 0) return;

    const layout = this.computeLayout(rows, columns);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const cardsPerPage = CARDS_PER_ROW * CARDS_PER_COL;

    const allCells = cards.flatMap((card) => card.rows.flat());
    const fontSizes = this.fitGlobalFontSize(doc, allCells, layout.cellW - 2, layout.cellH - 1.5);

    cards.forEach((card, index) => {
      const posInPage = index % cardsPerPage;
      if (posInPage === 0 && index > 0) doc.addPage();

      const col = posInPage % CARDS_PER_ROW;
      const row = Math.floor(posInPage / CARDS_PER_ROW);
      const x = MARGIN + col * (layout.cardW + GAP);
      const y = MARGIN + row * (layout.cardH + GAP);

      this.drawCard(doc, card, index, x, y, layout.cellW, layout.cellH, rows, columns, fontSizes, gameName);
    });

    doc.save(gameName.trim() ? `${gameName.trim()} - cartones.pdf` : 'bingo-musical.pdf');
  }

  downloadSongList(songs: Song[], gameName = ''): void {
    if (songs.length === 0) return;
    const sorted = [...songs].sort((a, b) => a.number - b.number);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const page = PAGE_MM.portrait;
    const margin = 12;
    const colGap = 6;
    const usableW = page.w - margin * 2;
    const usableH = page.h - margin * 2;

    const minRowH = 6;
    const maxRowsPerColumnEstimate = Math.max(1, Math.floor(usableH / minRowH));
    // ponytail: columns grow to fit any count on one page; switch to multi-page if lists get very long.
    const columns = Math.max(1, Math.ceil(sorted.length / maxRowsPerColumnEstimate));
    const rowsPerColumn = Math.ceil(sorted.length / columns);
    const rowH = Math.min(14, usableH / rowsPerColumn);
    const numberFontSize = Math.min(16, rowH * 1.9);
    const titleFontSize = Math.min(13, rowH * 1.55);
    const columnW = usableW / columns;

    let cursor = 0;
    for (let c = 0; c < columns; c++) {
      const colX = margin + c * columnW;
      const colSongs = sorted.slice(cursor, cursor + rowsPerColumn);
      cursor += colSongs.length;

      colSongs.forEach((song, r) => {
        const rowY = margin + r * rowH;
        if (r % 2 === 1) {
          doc.setFillColor(...ALT_ROW);
          doc.rect(colX, rowY, columnW - colGap, rowH, 'F');
        }
        const numberX = colX + 1.5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(numberFontSize);
        doc.setTextColor(...ACCENT);
        const numberText = String(song.number).padStart(2, '0');
        doc.text(numberText, numberX, rowY + rowH - rowH * 0.28);

        const titleX = numberX + doc.getTextWidth(numberText) + 2;
        doc.setFont('times', 'normal');
        doc.setFontSize(titleFontSize);
        doc.setTextColor(...TEXT_DARK);
        const title = this.fitText(doc, song.title, colX + columnW - colGap - titleX);
        doc.text(title, titleX, rowY + rowH - rowH * 0.28);
      });

      if (c > 0) {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(colX - colGap / 2, margin, colX - colGap / 2, page.h - margin);
      }
    }

    const fileName = gameName.trim() ? `${gameName.trim()} - listado canciones.pdf` : 'listado-canciones.pdf';
    doc.save(fileName);
  }

  private computeLayout(rows: number, columns: number) {
    const page = PAGE_MM.landscape;
    const usableW = page.w - MARGIN * 2;
    const usableH = page.h - MARGIN * 2;

    const cardWTarget = (usableW - (CARDS_PER_ROW - 1) * GAP) / CARDS_PER_ROW;
    const cardHTarget = (usableH - (CARDS_PER_COL - 1) * GAP) / CARDS_PER_COL;

    const cellW = cardWTarget / columns;
    const cellH = (cardHTarget - HEADER_H) / rows;
    const cardW = cellW * columns;
    const cardH = cellH * rows + HEADER_H;

    return { cellW, cellH, cardW, cardH };
  }

  private drawCard(
    doc: jsPDF,
    card: BingoCard,
    index: number,
    x: number,
    y: number,
    cellW: number,
    cellH: number,
    rows: number,
    columns: number,
    fontSizes: { songFontSize: number; artistFontSize: number },
    gameName: string,
  ): void {
    const cardW = cellW * columns;
    const cardH = cellH * rows;
    const gridY = y + HEADER_H;

    // Straight corners so the sheet can be cut into cards with a straightedge.
    doc.setFillColor(...HEADER_BG);
    doc.rect(x, y, cardW, HEADER_H + cardH, 'F');
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.rect(x, y, cardW, HEADER_H + cardH, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.min(9, HEADER_H * 1.4));
    doc.setTextColor(...ACCENT);
    const label = gameName.trim()
      ? `${gameName.trim()} - CARTÓN #${String(index + 1).padStart(3, '0')}`
      : `CARTÓN #${String(index + 1).padStart(3, '0')}`;
    doc.text(label, x + 2, y + HEADER_H * 0.7);

    doc.setFillColor(255, 255, 255);
    doc.rect(x, gridY, cardW, cardH, 'F');
    doc.setFillColor(...ALT_ROW);
    for (let r = 0; r < rows; r += 2) doc.rect(x, gridY + r * cellH, cardW, cellH, 'F');

    doc.setDrawColor(...GRID_LINE);
    doc.setLineWidth(0.25);
    for (let r = 0; r <= rows; r++) doc.line(x, gridY + r * cellH, x + cardW, gridY + r * cellH);
    for (let c = 0; c <= columns; c++) doc.line(x + c * cellW, gridY, x + c * cellW, gridY + cardH);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.rect(x, gridY, cardW, cardH, 'S');

    const maxCellWidth = cellW - 2;
    const { songFontSize, artistFontSize } = fontSizes;
    const songLineH = songFontSize * MM_PER_PT * LINE_HEIGHT;
    const artistLineH = artistFontSize * MM_PER_PT * LINE_HEIGHT;

    card.rows.forEach((cellRow, r) => {
      cellRow.forEach((cell, c) => {
        const cx = x + c * cellW + cellW / 2;
        const [song, artist] = splitSongTitle(cell.title);

        doc.setFont('times', 'bold');
        doc.setFontSize(songFontSize);
        const songLines: string[] = doc.splitTextToSize(song, maxCellWidth);

        doc.setFont('times', 'italic');
        doc.setFontSize(artistFontSize);
        const artistLines: string[] = artist ? doc.splitTextToSize(artist, maxCellWidth) : [];

        const blockH = songLines.length * songLineH + artistLines.length * artistLineH;
        let lineY = gridY + r * cellH + (cellH - blockH) / 2 + songLineH * 0.8;

        doc.setFont('times', 'bold');
        doc.setFontSize(songFontSize);
        doc.setTextColor(...TEXT_DARK);
        for (const line of songLines) {
          doc.text(line, cx, lineY, { align: 'center' });
          lineY += songLineH;
        }

        if (artistLines.length > 0) {
          doc.setFont('times', 'italic');
          doc.setFontSize(artistFontSize);
          doc.setTextColor(...TEXT_MUTED);
          for (const line of artistLines) {
            doc.text(line, cx, lineY, { align: 'center' });
            lineY += artistLineH;
          }
        }
      });
    });
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'normal');
  }

  /**
   * Searches font sizes from large to small for the biggest size where every cell's song
   * (bold, up to 3 lines) and artist (italic, ~72% size, up to 3 lines) fit maxWidthMm/maxHeightMm.
   * Applied uniformly across all cards so every title/artist renders at the same size.
   */
  private fitGlobalFontSize(
    doc: jsPDF,
    cells: BingoCell[],
    maxWidthMm: number,
    maxHeightMm: number,
  ): { songFontSize: number; artistFontSize: number } {
    const ARTIST_RATIO = 0.72;
    const MAX_LINES = 3;
    const parsed = cells.map((cell) => splitSongTitle(cell.title));

    for (let fontSize = 32; fontSize >= 6; fontSize -= 0.5) {
      const artistFontSize = fontSize * ARTIST_RATIO;
      const fits = parsed.every(([song, artist]) => {
        doc.setFont('times', 'bold');
        doc.setFontSize(fontSize);
        const songLines: string[] = doc.splitTextToSize(song, maxWidthMm);
        if (songLines.length > MAX_LINES) return false;

        let artistLines: string[] = [];
        if (artist) {
          doc.setFont('times', 'italic');
          doc.setFontSize(artistFontSize);
          artistLines = doc.splitTextToSize(artist, maxWidthMm);
          if (artistLines.length > MAX_LINES) return false;
        }

        const totalHeight =
          songLines.length * fontSize * MM_PER_PT * LINE_HEIGHT +
          artistLines.length * artistFontSize * MM_PER_PT * LINE_HEIGHT;
        return totalHeight <= maxHeightMm;
      });

      if (fits) return { songFontSize: fontSize, artistFontSize };
    }
    return { songFontSize: 6, artistFontSize: 6 * ARTIST_RATIO };
  }

  private fitText(doc: jsPDF, text: string, maxWidthMm: number): string {
    let result = text;
    while (result.length > 1 && doc.getTextWidth(result) > maxWidthMm) {
      result = result.slice(0, -1);
    }
    return result.length < text.length ? result.slice(0, -1) + '…' : result;
  }
}

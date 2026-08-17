import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { BingoCard, PdfSettings, Song } from '../models/bingo.models';

const PAGE_MM = { portrait: { w: 210, h: 297 }, landscape: { w: 297, h: 210 } };
const MARGIN = 10;
const GAP = 4;
const HEADER_H = 8;

const ACCENT: [number, number, number] = [109, 40, 217];
const HEADER_BG: [number, number, number] = [237, 233, 254];
const BORDER: [number, number, number] = [180, 170, 220];
const GRID_LINE: [number, number, number] = [210, 210, 220];
const ALT_ROW: [number, number, number] = [248, 246, 253];
const TEXT_DARK: [number, number, number] = [31, 34, 48];
const TEXT_MUTED: [number, number, number] = [110, 110, 120];

@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {
  download(cards: BingoCard[], settings: PdfSettings, rows: number, columns: number): void {
    if (cards.length === 0) return;

    const layout = this.resolveLayout(settings.orientation, rows, columns);
    const doc = new jsPDF({ orientation: layout.orientation, unit: 'mm', format: 'a4' });

    const cardsPerPage =
      settings.cardsPerPage === 'auto'
        ? layout.fitPerPage
        : Math.max(1, Math.min(settings.cardsPerPage, layout.fitPerPage));

    cards.forEach((card, index) => {
      const posInPage = index % cardsPerPage;
      if (posInPage === 0 && index > 0) doc.addPage();

      const col = posInPage % layout.perRow;
      const row = Math.floor(posInPage / layout.perRow);
      const x = MARGIN + col * (layout.cardW + GAP);
      const y = MARGIN + row * (layout.cardH + GAP);

      this.drawCard(doc, card, index, x, y, layout.cellW, layout.cellH, rows, columns, settings);
    });

    doc.save('bingo-musical.pdf');
  }

  downloadSongList(songs: Song[]): void {
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
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(numberFontSize);
        doc.setTextColor(...ACCENT);
        doc.text(String(song.number).padStart(2, '0'), colX + 1.5, rowY + rowH - rowH * 0.28);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(titleFontSize);
        doc.setTextColor(...TEXT_DARK);
        const numberColW = numberFontSize * 1.5;
        const title = this.fitText(doc, song.title, columnW - colGap - numberColW);
        doc.setFont('times', 'normal');
        doc.text(title, colX + numberColW, rowY + rowH - rowH * 0.28);
      });

      if (c > 0) {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(colX - colGap / 2, margin, colX - colGap / 2, page.h - margin);
      }
    }

    doc.save('listado-canciones.pdf');
  }

  /** Picks the orientation that fits more cards per page, unless the user forces one. */
  private resolveLayout(pref: PdfSettings['orientation'], rows: number, columns: number) {
    const portrait = this.computeLayout('portrait', rows, columns);
    if (pref === 'portrait') return portrait;

    const landscape = this.computeLayout('landscape', rows, columns);
    if (pref === 'landscape') return landscape;

    return landscape.fitPerPage > portrait.fitPerPage ? landscape : portrait;
  }

  private computeLayout(orientation: 'portrait' | 'landscape', rows: number, columns: number) {
    const page = PAGE_MM[orientation];
    const usableW = page.w - MARGIN * 2;
    const usableH = page.h - MARGIN * 2;

    // ponytail: raised caps so text fills as much of the page as the grid allows.
    const cellW = Math.min(46, usableW / columns);
    const cellH = Math.min(30, cellW * 0.65);
    const cardW = cellW * columns;
    const cardH = cellH * rows + HEADER_H;

    const perRow = Math.max(1, Math.floor((usableW + GAP) / (cardW + GAP)));
    const perCol = Math.max(1, Math.floor((usableH + GAP) / (cardH + GAP)));

    return { orientation, page, cellW, cellH, cardW, cardH, perRow, perCol, fitPerPage: perRow * perCol };
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
    settings: PdfSettings,
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

    if (settings.showCardNumber) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(Math.min(12, HEADER_H * 1.1));
      doc.setTextColor(...ACCENT);
      doc.text(`CARTÓN #${String(index + 1).padStart(3, '0')}`, x + 2.5, y + HEADER_H * 0.65);
    }

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

    const numberFontSize = Math.min(26, cellH * (settings.showSongTitles ? 0.5 : 0.85));
    const songFontSize = Math.min(16, cellH * 0.34);
    const artistFontSize = Math.min(13, cellH * 0.28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(numberFontSize);
    card.rows.forEach((cellRow, r) => {
      cellRow.forEach((cell, c) => {
        const cx = x + c * cellW + cellW / 2;
        const cy = gridY + r * cellH + (settings.showSongTitles ? cellH * 0.32 : cellH / 2 + numberFontSize * 0.12);
        doc.setTextColor(...TEXT_DARK);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(numberFontSize);
        doc.text(String(cell.number), cx, cy, { align: 'center' });
        if (settings.showSongTitles) {
          const [song, artist] = this.splitSongTitle(cell.title);
          doc.setFont('times', 'bold');
          doc.setFontSize(songFontSize);
          doc.setTextColor(...TEXT_MUTED);
          doc.text(this.fitText(doc, song, cellW - 1.5), cx, gridY + r * cellH + cellH * 0.66, { align: 'center' });
          if (artist) {
            doc.setFont('times', 'italic');
            doc.setFontSize(artistFontSize);
            doc.text(
              this.fitText(doc, artist, cellW - 1.5),
              cx,
              gridY + r * cellH + cellH * 0.86,
              { align: 'center' },
            );
          }
        }
      });
    });
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'normal');
  }

  private fitText(doc: jsPDF, text: string, maxWidthMm: number): string {
    let result = text;
    while (result.length > 1 && doc.getTextWidth(result) > maxWidthMm) {
      result = result.slice(0, -1);
    }
    return result.length < text.length ? result.slice(0, -1) + '…' : result;
  }

  /** Splits a "Song - Artist" title into two lines; falls back to one line if there's no separator. */
  private splitSongTitle(title: string): [string, string | null] {
    const separatorIndex = title.indexOf(' - ');
    if (separatorIndex === -1) return [title, null];
    return [title.slice(0, separatorIndex), title.slice(separatorIndex + 3)];
  }
}

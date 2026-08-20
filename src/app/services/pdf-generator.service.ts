import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { BingoCard, PdfSettings, Song } from '../models/bingo.models';

const PAGE_MM = { portrait: { w: 210, h: 297 }, landscape: { w: 297, h: 210 } };
const MARGIN = 10;
const GAP = 4;
const HEADER_H = 5;
const CARDS_PER_ROW = 3;
const CARDS_PER_COL = 3;
const LEGEND_GAP = 2;

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

    const layout = this.computeLayout(rows, columns, settings);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const cardsPerPage = CARDS_PER_ROW * CARDS_PER_COL;
    const maxDigits = Math.max(...cards.flatMap((c) => c.rows.flat().map((cell) => String(cell.number).length)));
    const numberFontSize = this.fitNumberFontSize(doc, layout.cellW, layout.cellH, maxDigits);

    cards.forEach((card, index) => {
      const posInPage = index % cardsPerPage;
      if (posInPage === 0 && index > 0) doc.addPage();

      const col = posInPage % CARDS_PER_ROW;
      const row = Math.floor(posInPage / CARDS_PER_ROW);
      const x = MARGIN + col * (layout.cardW + GAP);
      const y = MARGIN + row * (layout.cardH + GAP);

      this.drawCard(doc, card, index, x, y, layout.cellW, layout.cellH, layout.legendW, numberFontSize, settings);
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

    doc.save('listado-canciones.pdf');
  }

  private computeLayout(rows: number, columns: number, settings: PdfSettings) {
    const page = PAGE_MM.landscape;
    const usableW = page.w - MARGIN * 2;
    const usableH = page.h - MARGIN * 2;

    const cardWTarget = (usableW - (CARDS_PER_ROW - 1) * GAP) / CARDS_PER_ROW;
    const cardHTarget = (usableH - (CARDS_PER_COL - 1) * GAP) / CARDS_PER_COL;

    const legendW = settings.showSongTitles ? Math.min(34, cardWTarget * 0.34) : 0;
    const gridWTarget = cardWTarget - (legendW > 0 ? legendW + LEGEND_GAP : 0);

    const cellW = Math.min(46, gridWTarget / columns);
    const cellH = Math.min(40, (cardHTarget - HEADER_H) / rows);
    const cardW = cellW * columns + (legendW > 0 ? legendW + LEGEND_GAP : 0);
    const cardH = cellH * rows + HEADER_H;

    return { cellW, cellH, legendW, cardW, cardH };
  }

  private drawCard(
    doc: jsPDF,
    card: BingoCard,
    index: number,
    x: number,
    y: number,
    cellW: number,
    cellH: number,
    legendW: number,
    numberFontSize: number,
    settings: PdfSettings,
  ): void {
    const rows = card.rows.length;
    const columns = card.rows[0]?.length ?? 0;
    const gridW = cellW * columns;
    const cardW = gridW + (legendW > 0 ? legendW + LEGEND_GAP : 0);
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
      doc.setFontSize(Math.min(9, HEADER_H * 1.4));
      doc.setTextColor(...ACCENT);
      doc.text(`CARTÓN #${String(index + 1).padStart(3, '0')}`, x + 2, y + HEADER_H * 0.7);
    }

    doc.setFillColor(255, 255, 255);
    doc.rect(x, gridY, gridW, cardH, 'F');
    doc.setFillColor(...ALT_ROW);
    for (let r = 0; r < rows; r += 2) doc.rect(x, gridY + r * cellH, gridW, cellH, 'F');

    doc.setDrawColor(...GRID_LINE);
    doc.setLineWidth(0.25);
    for (let r = 0; r <= rows; r++) doc.line(x, gridY + r * cellH, x + gridW, gridY + r * cellH);
    for (let c = 0; c <= columns; c++) doc.line(x + c * cellW, gridY, x + c * cellW, gridY + cardH);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.rect(x, gridY, gridW, cardH, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_DARK);
    card.rows.forEach((cellRow, r) => {
      cellRow.forEach((cell, c) => {
        const cx = x + c * cellW + cellW / 2;
        const cy = gridY + r * cellH + cellH / 2 + numberFontSize * 0.12;
        doc.setFontSize(numberFontSize);
        doc.text(String(cell.number), cx, cy, { align: 'center' });
      });
    });

    if (legendW > 0) {
      this.drawLegend(doc, card, x + gridW + LEGEND_GAP, gridY, legendW, cardH, rows * columns);
    }

    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'normal');
  }

  /** Largest font size (bold, helvetica) that fits both the cell width (for the widest number) and height. */
  private fitNumberFontSize(doc: jsPDF, cellW: number, cellH: number, maxDigits: number): number {
    doc.setFont('helvetica', 'bold');
    const sample = '8'.repeat(maxDigits);
    const probeSize = 10;
    doc.setFontSize(probeSize);
    const widthPerPt = doc.getTextWidth(sample) / probeSize;
    const maxByWidth = (cellW - 2) / widthPerPt;
    return Math.min(40, maxByWidth, cellH * 0.8);
  }

  /** Small "número - canción" reference list next to the grid, sorted ascending. */
  private drawLegend(doc: jsPDF, card: BingoCard, x: number, y: number, w: number, h: number, entryCount: number): void {
    const entries = card.rows
      .flat()
      .slice()
      .sort((a, b) => a.number - b.number);

    const rowH = h / entryCount;
    const fontSize = Math.min(7, rowH * 1.8);

    entries.forEach((entry, i) => {
      const rowY = y + i * rowH;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      doc.setTextColor(...ACCENT);
      const numberText = String(entry.number);
      doc.text(numberText, x, rowY + rowH * 0.75);

      const titleX = x + doc.getTextWidth(numberText) + 1.5;
      doc.setFont('times', 'normal');
      doc.setTextColor(...TEXT_MUTED);
      doc.text(this.fitText(doc, entry.title, x + w - titleX), titleX, rowY + rowH * 0.75);
    });
  }

  private fitText(doc: jsPDF, text: string, maxWidthMm: number): string {
    let result = text;
    while (result.length > 1 && doc.getTextWidth(result) > maxWidthMm) {
      result = result.slice(0, -1);
    }
    return result.length < text.length ? result.slice(0, -1) + '…' : result;
  }
}

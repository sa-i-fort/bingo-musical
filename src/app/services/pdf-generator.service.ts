import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { BingoCard, PdfSettings } from '../models/bingo.models';

const PAGE_MM = { portrait: { w: 210, h: 297 }, landscape: { w: 297, h: 210 } };
const MARGIN = 10;
const HEADER_H = 8; // space for "CARTÓN #n" label above the grid
const TITLE_H = 12; // space for the page title

/**
 * Responsible exclusively for laying out cards on an A4 PDF and downloading it.
 * Knows nothing about how cards were generated.
 */
@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {
  download(cards: BingoCard[], settings: PdfSettings, rows: number, columns: number): void {
    if (cards.length === 0) return;

    const orientation = this.resolveOrientation(settings.orientation, rows, columns);
    const page = PAGE_MM[orientation];
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    const usableW = page.w - MARGIN * 2;
    const usableH = page.h - MARGIN * 2 - TITLE_H;

    // Cell size: fit columns within a sensible card width, cap for readability.
    const cellW = Math.min(30, usableW / columns);
    const cellH = Math.min(18, cellW * 0.65);
    const cardW = cellW * columns;
    const cardH = cellH * rows + HEADER_H;

    const perRow = Math.max(1, Math.floor(usableW / cardW));
    const perCol = Math.max(1, Math.floor(usableH / cardH));
    const fitPerPage = perRow * perCol;
    const cardsPerPage =
      settings.cardsPerPage === 'auto' ? fitPerPage : Math.max(1, Math.min(settings.cardsPerPage, fitPerPage));

    cards.forEach((card, index) => {
      const posInPage = index % cardsPerPage;
      if (posInPage === 0) {
        if (index > 0) doc.addPage();
        doc.setFontSize(16);
        doc.text(settings.title || 'BINGO MUSICAL', page.w / 2, MARGIN + 5, { align: 'center' });
      }

      const col = posInPage % perRow;
      const row = Math.floor(posInPage / perRow);
      const x = MARGIN + col * cardW;
      const y = MARGIN + TITLE_H + row * cardH;

      this.drawCard(doc, card, index, x, y, cellW, cellH, rows, columns, settings);
    });

    doc.save('bingo-musical.pdf');
  }

  private resolveOrientation(pref: PdfSettings['orientation'], rows: number, columns: number): 'portrait' | 'landscape' {
    if (pref !== 'auto') return pref;
    return columns > rows * 1.3 ? 'landscape' : 'portrait';
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
    if (settings.showCardNumber) {
      doc.setFontSize(10);
      doc.text(`CARTÓN #${String(index + 1).padStart(3, '0')}`, x, y + 4);
    }
    const gridY = y + HEADER_H;
    doc.setLineWidth(0.3);
    doc.rect(x, gridY, cellW * columns, cellH * rows);

    for (let r = 0; r <= rows; r++) doc.line(x, gridY + r * cellH, x + cellW * columns, gridY + r * cellH);
    for (let c = 0; c <= columns; c++) doc.line(x + c * cellW, gridY, x + c * cellW, gridY + cellH * rows);

    doc.setFontSize(11);
    card.rows.forEach((cellRow, r) => {
      cellRow.forEach((cell, c) => {
        const cx = x + c * cellW + cellW / 2;
        const cy = gridY + r * cellH + (settings.showSongTitles ? cellH * 0.42 : cellH / 2 + 1);
        doc.text(String(cell.number), cx, cy, { align: 'center' });
        if (settings.showSongTitles) {
          doc.setFontSize(6);
          const title = this.fitText(doc, cell.title, cellW - 1);
          doc.text(title, cx, cy + 4, { align: 'center' });
          doc.setFontSize(11);
        }
      });
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

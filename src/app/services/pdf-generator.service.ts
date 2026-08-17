import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { BingoCard, PdfSettings } from '../models/bingo.models';

const PAGE_MM = { portrait: { w: 210, h: 297 }, landscape: { w: 297, h: 210 } };
const MARGIN = 10;
const GAP = 4; // space between cards on the same page
const HEADER_H = 8; // "CARTÓN #n" band above the grid
const TITLE_H = 16; // page title band

const ACCENT: [number, number, number] = [109, 40, 217]; // matches the app's primary color
const HEADER_BG: [number, number, number] = [237, 233, 254];
const BORDER: [number, number, number] = [180, 170, 220];
const GRID_LINE: [number, number, number] = [210, 210, 220];
const ALT_ROW: [number, number, number] = [248, 246, 253];
const TEXT_DARK: [number, number, number] = [31, 34, 48];
const TEXT_MUTED: [number, number, number] = [110, 110, 120];

/**
 * Responsible exclusively for laying out cards on an A4 PDF and downloading it.
 * Knows nothing about how cards were generated.
 */
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
    const totalPages = Math.ceil(cards.length / cardsPerPage);

    cards.forEach((card, index) => {
      const posInPage = index % cardsPerPage;
      if (posInPage === 0) {
        if (index > 0) doc.addPage();
        const pageNumber = Math.floor(index / cardsPerPage) + 1;
        this.drawPageHeader(doc, layout.page.w, settings.title, pageNumber, totalPages);
      }

      const col = posInPage % layout.perRow;
      const row = Math.floor(posInPage / layout.perRow);
      const x = MARGIN + col * (layout.cardW + GAP);
      const y = MARGIN + TITLE_H + row * (layout.cardH + GAP);

      this.drawCard(doc, card, index, x, y, layout.cellW, layout.cellH, rows, columns, settings);
    });

    doc.save('bingo-musical.pdf');
  }

  /** Picks the orientation that actually fits more cards per page, unless the user forces one. */
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
    const usableH = page.h - MARGIN * 2 - TITLE_H;

    const cellW = Math.min(30, usableW / columns);
    const cellH = Math.min(18, cellW * 0.65);
    const cardW = cellW * columns;
    const cardH = cellH * rows + HEADER_H;

    const perRow = Math.max(1, Math.floor((usableW + GAP) / (cardW + GAP)));
    const perCol = Math.max(1, Math.floor((usableH + GAP) / (cardH + GAP)));

    return { orientation, page, cellW, cellH, cardW, cardH, perRow, perCol, fitPerPage: perRow * perCol };
  }

  private drawPageHeader(doc: jsPDF, pageWidth: number, title: string, pageNumber: number, totalPages: number): void {
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, pageWidth, TITLE_H, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(title || 'BINGO MUSICAL', pageWidth / 2, TITLE_H / 2 + 3, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - MARGIN, TITLE_H / 2 + 2, { align: 'right' });
    doc.setTextColor(...TEXT_DARK);
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

    // Card frame + header band, both rounded so the whole card reads as one unit.
    doc.setFillColor(...HEADER_BG);
    doc.roundedRect(x, y, cardW, HEADER_H + cardH, 2, 2, 'F');
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, cardW, HEADER_H + cardH, 2, 2, 'S');

    if (settings.showCardNumber) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...ACCENT);
      doc.text(`CARTÓN #${String(index + 1).padStart(3, '0')}`, x + 2.5, y + 5.5);
    }

    // Alternating row shading, drawn before the grid lines so they stay crisp on top.
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

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    card.rows.forEach((cellRow, r) => {
      cellRow.forEach((cell, c) => {
        const cx = x + c * cellW + cellW / 2;
        const cy = gridY + r * cellH + (settings.showSongTitles ? cellH * 0.42 : cellH / 2 + 1.2);
        doc.setTextColor(...TEXT_DARK);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(String(cell.number), cx, cy, { align: 'center' });
        if (settings.showSongTitles) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6);
          doc.setTextColor(...TEXT_MUTED);
          const title = this.fitText(doc, cell.title, cellW - 1.5);
          doc.text(title, cx, cy + 4, { align: 'center' });
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
}

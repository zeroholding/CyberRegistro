/**
 * Versão SERVER-SIDE do gerador de certificados
 * Retorna os bytes do PDF em vez de fazer download automaticamente
 * Usado pelas APIs para armazenar o PDF no banco de dados
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface RegistroCertificateInput {
  title: string;
  mlbCode: string;
  permalink?: string;
  account?: {
    nickname?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  autorNome?: string;
  titularNome?: string;
  autorCpfCnpj?: string | null;
  titularCpfCnpj?: string | null;
  usuario: {
    nome: string;
    cpfCnpj?: string | null;
    email?: string | null;
  };
}

function safe(value: string | null | undefined): string {
  return (value ?? "").toString().trim();
}

function formatCpfCnpj(raw?: string | null): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 11)
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (digits.length === 14)
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  return raw ?? "—";
}

function sanitizeWinAnsi(input: string): string {
  if (!input) return "";
  return input
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-")
    .replace(/[\u2212]/g, "-")
    .replace(/[\u00A0]/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
}

function measureWords(font: any, size: number, words: string[]) {
  return words.map((w) => ({
    text: w,
    width: font.widthOfTextAtSize(w, size),
  }));
}

function drawJustifiedLine(
  page: any,
  words: { text: string; width: number }[],
  x: number,
  y: number,
  maxWidth: number,
  font: any,
  size: number,
  color: any,
  justify: boolean
) {
  const totalWordsWidth = words.reduce((s, w) => s + w.width, 0);
  const gaps = Math.max(0, words.length - 1);
  let gapWidth = font.widthOfTextAtSize(" ", size);
  if (justify && gaps > 0) {
    const free = Math.max(0, maxWidth - totalWordsWidth);
    gapWidth = free / gaps;
  }
  let cursor = x;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    page.drawText(w.text, { x: cursor, y, size, font, color });
    cursor += w.width + (i < words.length - 1 ? gapWidth : 0);
  }
}

function drawJustifiedParagraph(
  page: any,
  text: string,
  x: number,
  topY: number,
  maxWidth: number,
  minY: number,
  font: any,
  size: number,
  color: any,
  lineGap = 3
) {
  const clean = sanitizeWinAnsi(text).replace(/\s+/g, " ").trim();
  const words = clean.length ? clean.split(" ") : [];
  if (words.length === 0) return { y: topY, remaining: "" };
  const measured = measureWords(font, size, words);
  const spaceWidth = font.widthOfTextAtSize(" ", size);
  let y = topY;
  let line: { text: string; width: number }[] = [];
  let lineWidth = 0;
  let index = 0;

  while (index < measured.length) {
    const w = measured[index];
    const extra = line.length > 0 ? spaceWidth : 0;
    if (lineWidth + extra + w.width <= maxWidth) {
      line.push(w);
      lineWidth += extra + w.width;
      index++;
    } else {
      if (y - size < minY) break;
      drawJustifiedLine(page, line, x, y, maxWidth, font, size, color, true);
      y -= size + lineGap;
      line = [];
      lineWidth = 0;
    }
  }

  if (line.length && y - size >= minY) {
    drawJustifiedLine(page, line, x, y, maxWidth, font, size, color, false);
    y -= size + lineGap;
  }

  const remaining = measured
    .slice(index)
    .map((m) => m.text)
    .join(" ");
  return { y, remaining };
}

async function embedRemoteImage(
  pdfDoc: PDFDocument,
  url: string
): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    try {
      return await pdfDoc.embedPng(bytes);
    } catch {
      try {
        return await pdfDoc.embedJpg(bytes);
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }
}

async function sha256Hex(str: string): Promise<string | null> {
  try {
    const enc = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Gera o PDF do certificado e retorna os bytes + metadata
 * NÃO faz download automático - retorna dados para armazenamento
 */
export async function generateRegistroCertificatePDFServer(
  input: RegistroCertificateInput
): Promise<{ pdfBytes: Uint8Array; hash: string; timestamp: string }> {
  // A4 portrait
  const WIDTH = 595;
  const HEIGHT = 842;
  const M = 30;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Carregar logo - usar fetch absoluto para funcionar no servidor
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.cyberregistro.com.br";
  const logoUrl = `${baseUrl}/cyber.png`;
  const logoResponse = await fetch(logoUrl);
  const logoBytes = await logoResponse.arrayBuffer();
  const logoImage = await pdfDoc.embedPng(new Uint8Array(logoBytes));

  const page = pdfDoc.addPage([WIDTH, HEIGHT]);

  // Paleta de cores
  const bg = rgb(0 / 255, 31 / 255, 63 / 255);
  const bgDark = rgb(0 / 255, 15 / 255, 40 / 255);
  const bgMedium = rgb(0 / 255, 45 / 255, 80 / 255);
  const primary = rgb(0 / 255, 217 / 255, 255 / 255);
  const panel = rgb(0 / 255, 40 / 255, 75 / 255);
  const white = rgb(1, 1, 1);

  // Fundo base azul navy escuro
  page.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: bg });

  // Gradiente sutil de azul
  page.drawRectangle({
    x: 0,
    y: HEIGHT - 200,
    width: WIDTH,
    height: 200,
    color: bgDark,
    opacity: 0.6,
  });

  page.drawRectangle({
    x: 0,
    y: 200,
    width: WIDTH,
    height: 300,
    color: bgMedium,
    opacity: 0.3,
  });

  // Círculos decorativos
  page.drawEllipse({
    x: WIDTH - 150,
    y: HEIGHT - 150,
    xScale: 180,
    yScale: 180,
    color: primary,
    opacity: 0.08,
  });
  page.drawEllipse({
    x: WIDTH - 150,
    y: HEIGHT - 150,
    xScale: 150,
    yScale: 150,
    color: primary,
    opacity: 0.05,
  });

  page.drawEllipse({
    x: -80,
    y: 200,
    xScale: 220,
    yScale: 220,
    color: primary,
    opacity: 0.06,
  });

  page.drawEllipse({
    x: WIDTH / 2,
    y: HEIGHT / 2,
    xScale: 150,
    yScale: 150,
    color: primary,
    opacity: 0.04,
  });

  // Círculos pequenos brilhantes
  const smallCircles = [
    { x: WIDTH - 100, y: HEIGHT - 200, size: 3 },
    { x: 80, y: HEIGHT - 150, size: 2 },
    { x: WIDTH / 2 + 150, y: HEIGHT - 100, size: 2.5 },
    { x: 120, y: 400, size: 2 },
    { x: WIDTH - 80, y: 350, size: 3 },
    { x: WIDTH / 2 - 100, y: 250, size: 2 },
  ];

  smallCircles.forEach((circle) => {
    page.drawEllipse({
      x: circle.x,
      y: circle.y,
      xScale: circle.size,
      yScale: circle.size,
      color: primary,
      opacity: 0.6,
    });
  });

  // Linhas de conexão
  page.drawLine({
    start: { x: WIDTH - 150, y: HEIGHT - 100 },
    end: { x: WIDTH - 50, y: HEIGHT - 100 },
    thickness: 1,
    color: primary,
    opacity: 0.2,
  });
  page.drawLine({
    start: { x: 50, y: HEIGHT - 180 },
    end: { x: 150, y: HEIGHT - 180 },
    thickness: 1,
    color: primary,
    opacity: 0.15,
  });

  // Logo
  const logoSize = 90;
  const logoX = M;
  const logoY = HEIGHT - M - logoSize;

  page.drawImage(logoImage, {
    x: logoX,
    y: logoY,
    width: logoSize,
    height: logoSize,
  });

  // Selo © cyan
  const sealX = WIDTH - M - 58;
  const sealY = HEIGHT - M - 26;

  page.drawEllipse({
    x: sealX + 28,
    y: sealY + 20,
    xScale: 30,
    yScale: 30,
    color: primary,
    opacity: 0.3,
  });

  page.drawEllipse({
    x: sealX + 28,
    y: sealY + 20,
    xScale: 26,
    yScale: 26,
    color: bgDark,
  });

  page.drawEllipse({
    x: sealX + 28,
    y: sealY + 20,
    xScale: 26,
    yScale: 26,
    borderColor: primary,
    borderWidth: 2,
  });

  page.drawText("©", {
    x: sealX + 20,
    y: sealY + 8,
    size: 26,
    font: fontBold,
    color: white,
  });

  // Título
  const titleX = M + logoSize + 20;
  const titleBaseY = logoY + logoSize / 2 + 5;
  page.drawText("CERTIFICADO DE REGISTRO", {
    x: titleX,
    y: titleBaseY,
    size: 20,
    font: fontBold,
    color: white,
  });

  page.drawText("Declaração de Autoria e Propriedade Intelectual", {
    x: titleX,
    y: titleBaseY - 20,
    size: 9,
    font,
    color: white,
  });

  // Cartão principal
  const cardX = M,
    cardY = HEIGHT - 155,
    cardW = WIDTH - M * 2,
    cardH = 260;

  page.drawRectangle({
    x: cardX - 2,
    y: cardY - cardH - 2,
    width: cardW + 4,
    height: cardH + 4,
    color: primary,
    opacity: 0.15,
  });

  page.drawRectangle({
    x: cardX,
    y: cardY - cardH,
    width: cardW,
    height: cardH,
    color: panel,
  });

  page.drawRectangle({
    x: cardX,
    y: cardY - 50,
    width: cardW,
    height: 50,
    color: bgMedium,
    opacity: 0.5,
  });

  page.drawRectangle({
    x: cardX,
    y: cardY - cardH,
    width: cardW,
    height: cardH,
    borderColor: primary,
    borderWidth: 2,
  });

  page.drawRectangle({
    x: cardX + 2,
    y: cardY - cardH + 2,
    width: cardW - 4,
    height: cardH - 4,
    borderColor: primary,
    borderWidth: 1,
    opacity: 0.4,
  });

  // Cantos decorativos
  page.drawLine({
    start: { x: cardX, y: cardY - 15 },
    end: { x: cardX + 25, y: cardY - 15 },
    thickness: 3,
    color: primary,
  });
  page.drawLine({
    start: { x: cardX + 15, y: cardY },
    end: { x: cardX + 15, y: cardY - 25 },
    thickness: 3,
    color: primary,
  });

  page.drawLine({
    start: { x: cardX + cardW - 25, y: cardY - cardH + 15 },
    end: { x: cardX + cardW, y: cardY - cardH + 15 },
    thickness: 3,
    color: primary,
  });
  page.drawLine({
    start: { x: cardX + cardW - 15, y: cardY - cardH },
    end: { x: cardX + cardW - 15, y: cardY - cardH + 25 },
    thickness: 3,
    color: primary,
  });

  let y = cardY - 28;

  // Chip MLB
  const chip = sanitizeWinAnsi(safe(input.mlbCode || input.title));
  const chipSize = 10,
    chipPadX = 10,
    chipPadY = 6;
  const chipWidth = fontBold.widthOfTextAtSize(chip, chipSize) + chipPadX * 2;
  const chipHeight = chipSize + chipPadY * 2;

  page.drawRectangle({
    x: cardX + 14,
    y: y - chipHeight + 1,
    width: chipWidth + 2,
    height: chipHeight + 2,
    color: primary,
    opacity: 0.3,
  });

  page.drawRectangle({
    x: cardX + 15,
    y: y - chipHeight + 2,
    width: chipWidth,
    height: chipHeight,
    color: bgDark,
  });

  page.drawRectangle({
    x: cardX + 15,
    y: y - chipHeight + 2,
    width: chipWidth,
    height: chipHeight,
    borderColor: primary,
    borderWidth: 1.5,
  });

  page.drawText(chip, {
    x: cardX + 15 + chipPadX,
    y: y - chipPadY - chipSize + 2,
    size: chipSize,
    font: fontBold,
    color: white,
  });
  y -= 32;

  // Autor da Obra
  page.drawText("Autor da Obra", {
    x: cardX + 15,
    y,
    size: 10,
    font: fontBold,
    color: white,
  });
  const autorCpf = input.autorCpfCnpj ?? input.usuario?.cpfCnpj;
  if (autorCpf) {
    const cpfFormatted = formatCpfCnpj(autorCpf);
    const cpfLabel = "CPF/CNPJ: " + cpfFormatted;
    const cpfWidth = font.widthOfTextAtSize(cpfLabel, 10);
    page.drawText(cpfLabel, {
      x: cardX + cardW - cpfWidth - 15,
      y,
      size: 10,
      font: fontBold,
      color: white,
    });
  }
  y -= 15;
  const autorNomeValue =
    sanitizeWinAnsi(safe(input.autorNome)) ||
    sanitizeWinAnsi(safe(input.usuario?.nome)) ||
    `${safe(input.account?.firstName)} ${safe(
      input.account?.lastName
    )}`.trim() ||
    sanitizeWinAnsi(safe(input.account?.nickname)) ||
    "-";
  page.drawText(autorNomeValue, {
    x: cardX + 15,
    y,
    size: 12,
    font,
    color: white,
  });
  y -= 22;

  // Titular dos Direitos
  page.drawText("Titular dos Direitos", {
    x: cardX + 15,
    y,
    size: 10,
    font: fontBold,
    color: white,
  });
  const titularCpf = input.titularCpfCnpj ?? input.usuario?.cpfCnpj;
  if (titularCpf) {
    const cpfFormatted = formatCpfCnpj(titularCpf);
    const cpfLabel = "CPF/CNPJ: " + cpfFormatted;
    const cpfWidth = font.widthOfTextAtSize(cpfLabel, 10);
    page.drawText(cpfLabel, {
      x: cardX + cardW - cpfWidth - 15,
      y,
      size: 10,
      font: fontBold,
      color: white,
    });
  }
  y -= 15;
  const titularNomeValue =
    sanitizeWinAnsi(safe(input.titularNome)) || autorNomeValue;
  page.drawText(titularNomeValue, {
    x: cardX + 15,
    y,
    size: 12,
    font,
    color: white,
  });
  y -= 22;

  // Declaração
  page.drawText("Declaração", {
    x: cardX + 15,
    y,
    size: 10,
    font: fontBold,
    color: white,
  });
  y -= 14;
  const mlbCodeClean = sanitizeWinAnsi(safe(input.mlbCode));
  const declaracao = `Este registro de direito e protecao autoral diz respeito a exclusividade e protecao contra plagio e/ou copia das exatas imagens que constam neste certificado de registro, as quais correspondem ao produto exato que carrega o titulo da obra: ${mlbCodeClean}`;
  const decMaxW = cardW - 30;
  const decMinY = cardY - cardH + 15;
  let afterDec = drawJustifiedParagraph(
    page,
    declaracao,
    cardX + 15,
    y,
    decMaxW,
    decMinY,
    font,
    10,
    white,
    2
  );
  y = afterDec.y - 6;

  // Gerar timestamp e hash FIXOS
  const ts = new Date().toISOString();
  const payloadStr = `${input.mlbCode}|${autorNomeValue}|${titularNomeValue}|${ts}`;
  const hash = await sha256Hex(payloadStr);
  const verifyUrl = hash
    ? `https://cyberregistro.com/verify?mlb=${encodeURIComponent(
        input.mlbCode
      )}&ts=${encodeURIComponent(ts)}&h=${hash}`
    : input.permalink || "https://cyberregistro.com";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
    verifyUrl
  )}`;
  const qr = await embedRemoteImage(pdfDoc, qrUrl);

  // Texto legal
  const qrAreaSize = 100;
  const qrAndLegalOffset = 6;
  const legalYStart = cardY - cardH - 12 - qrAndLegalOffset;
  const legalMaxW = WIDTH - M * 2 - (qrAreaSize + 35);
  const textoLegal = sanitizeWinAnsi(
    "O presente certificado atesta, por meio das tecnologias de hashcode (SHA-256), carimbo de tempo (TimeStamping em padrao UTC fornecido pelo BIPM - Bureau International des Poids et Mesures) e assinatura digital, que a pessoa indicada neste documento declarou-se autora da obra aqui mencionada. Este comprovante esta em conformidade com a Convencao de Berna (INTL), Convencao do Metro (INTL), Lei 9.610 (BR), WIPO Copyright Treaty (INTL), US Copyright Law (US), UCC Geneva (INTL), bem como demais legislacoes aplicaveis ao Direito Autoral dos paises signatarios dos referidos tratados. Qualquer divergencia ou inconsistencia nos dados fornecidos e de inteira responsabilidade do declarante, podendo configurar crime em determinados paises. Ressalta-se que a Cyber Registro nao realiza upload dos arquivos originais, sendo responsabilidade exclusiva do usuario preservar a integridade da obra (arquivo), que devera ser apresentada, quando necessario, juntamente com este certificado, para fins de comprovacao do conteudo efetivamente registrado."
  );

  drawJustifiedParagraph(
    page,
    textoLegal,
    M,
    legalYStart,
    legalMaxW,
    M + 180,
    font,
    8,
    white,
    3
  );

  // QR Code
  const qrAreaX = WIDTH - M - (qrAreaSize + 10);
  const qrAreaY = legalYStart - qrAreaSize + 8;

  if (qr) {
    page.drawRectangle({
      x: qrAreaX + 2,
      y: qrAreaY - 2,
      width: qrAreaSize,
      height: qrAreaSize,
      color: rgb(0, 0, 0),
      opacity: 0.2,
    });

    page.drawRectangle({
      x: qrAreaX,
      y: qrAreaY,
      width: qrAreaSize,
      height: qrAreaSize,
      color: white,
    });

    page.drawRectangle({
      x: qrAreaX - 2,
      y: qrAreaY - 2,
      width: qrAreaSize + 4,
      height: qrAreaSize + 4,
      borderColor: primary,
      borderWidth: 2,
    });

    page.drawRectangle({
      x: qrAreaX - 4,
      y: qrAreaY - 4,
      width: qrAreaSize + 8,
      height: qrAreaSize + 8,
      borderColor: primary,
      borderWidth: 1,
      opacity: 0.5,
    });

    page.drawImage(qr, {
      x: qrAreaX,
      y: qrAreaY,
      width: qrAreaSize,
      height: qrAreaSize,
    });
  }

  // Seção de Hash
  const hashBoxX = M;
  const hashBoxY = M + 100;
  const hashBoxW = WIDTH - M * 2;
  const hashBoxH = 65;

  page.drawRectangle({
    x: hashBoxX - 2,
    y: hashBoxY - 2,
    width: hashBoxW + 4,
    height: hashBoxH + 4,
    color: primary,
    opacity: 0.15,
  });

  page.drawRectangle({
    x: hashBoxX,
    y: hashBoxY,
    width: hashBoxW,
    height: hashBoxH,
    color: panel,
  });

  page.drawRectangle({
    x: hashBoxX,
    y: hashBoxY + hashBoxH - 24,
    width: hashBoxW,
    height: 24,
    color: bgMedium,
    opacity: 0.5,
  });

  page.drawRectangle({
    x: hashBoxX,
    y: hashBoxY,
    width: hashBoxW,
    height: hashBoxH,
    borderColor: primary,
    borderWidth: 2,
  });

  page.drawRectangle({
    x: hashBoxX + 2,
    y: hashBoxY + 2,
    width: hashBoxW - 4,
    height: hashBoxH - 4,
    borderColor: primary,
    borderWidth: 1,
    opacity: 0.4,
  });

  // Ícone de cadeado
  const lockX = hashBoxX + 12;
  const lockY = hashBoxY + hashBoxH - 12;

  page.drawRectangle({
    x: lockX,
    y: lockY - 6,
    width: 7,
    height: 6,
    color: white,
  });

  page.drawEllipse({
    x: lockX + 3.5,
    y: lockY + 1,
    xScale: 3,
    yScale: 3,
    color: white,
  });
  page.drawEllipse({
    x: lockX + 3.5,
    y: lockY + 1,
    xScale: 2,
    yScale: 2,
    color: bgDark,
  });

  page.drawText("HASH CRIPTOGRAFICA DO REGISTRO (SHA-256)", {
    x: lockX + 15,
    y: hashBoxY + hashBoxH - 15,
    size: 8,
    font: fontBold,
    color: white,
  });

  if (hash) {
    const hashPart1 = hash.substring(0, 32);
    const hashPart2 = hash.substring(32);

    page.drawText(hashPart1, {
      x: hashBoxX + 12,
      y: hashBoxY + hashBoxH - 29,
      size: 8,
      font,
      color: white,
    });

    page.drawText(hashPart2, {
      x: hashBoxX + 12,
      y: hashBoxY + hashBoxH - 42,
      size: 8,
      font,
      color: white,
    });

    page.drawText(
      "Esta hash garante a integridade e autenticidade do registro",
      {
        x: hashBoxX + 12,
        y: hashBoxY + hashBoxH - 54,
        size: 6.5,
        font,
        color: white,
      }
    );
  }

  // Rodapé
  const brand1 = "CYBER REGISTRO";
  const brand2 = "CNPJ: 51.670.332/0001-14";

  const dateObj = new Date(ts);
  const timestampUTC = dateObj.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });
  const timestampBRT = dateObj.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const timestampFormatted = `${timestampUTC} UTC | ${timestampBRT} UTC -3 BRT Time Zone`;

  let footerY = M + 88;

  page.drawText("TIMESTAMP:", {
    x: M,
    y: footerY,
    size: 7,
    font: fontBold,
    color: white,
  });
  page.drawText(timestampFormatted, {
    x: M + 52,
    y: footerY,
    size: 7,
    font,
    color: white,
  });
  footerY -= 12;

  page.drawText("TÍTULO DA OBRA:", {
    x: M,
    y: footerY,
    size: 7,
    font: fontBold,
    color: white,
  });
  page.drawText(sanitizeWinAnsi(safe(input.mlbCode)), {
    x: M + 75,
    y: footerY,
    size: 7,
    font,
    color: white,
  });
  footerY -= 18;

  page.drawText(brand1, {
    x: M,
    y: footerY,
    size: 9,
    font: fontBold,
    color: white,
  });
  footerY -= 12;

  page.drawText(brand2, {
    x: M,
    y: footerY,
    size: 7,
    font,
    color: white,
  });

  page.drawLine({
    start: { x: M, y: M + 28 },
    end: { x: WIDTH - M, y: M + 28 },
    thickness: 1,
    color: primary,
    opacity: 0.3,
  });

  page.drawText("Cyber Registro © 2025 - Documento autentico e verificavel", {
    x: M,
    y: M + 18,
    size: 7,
    font,
    color: white,
  });

  // Salvar PDF e calcular hash
  const pdfBytes = await pdfDoc.save();
  const certHash = await sha256HexBytes(pdfBytes);

  return {
    pdfBytes,
    hash: hash || certHash,
    timestamp: ts,
  };
}

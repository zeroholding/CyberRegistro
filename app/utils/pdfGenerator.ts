import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface AnuncioPDFData {
  title: string;
  mlbCode: string;
  price: number;
  availableQuantity: number;
  soldQuantity: number;
  status: string;
  condition: string;
  listingType: string;
  permalink: string;
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  account: {
    nickname: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  pictures: any[];
  description: string;
  attributes: any[];
  warranty: string;
  shipping: any;
}

// Função auxiliar para quebrar texto em múltiplas linhas
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// Função auxiliar para adicionar imagem com tratamento de erro
async function embedImageSafe(pdfDoc: PDFDocument, imageUrl: string): Promise<any | null> {
  try {
    // Se for URL externa, usar proxy do servidor para evitar CORS e WEBP/AVIF
    const isRemote = /^https?:\/\//i.test(imageUrl);
    const proxiedUrl = isRemote ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}` : imageUrl;

    const response = await fetch(proxiedUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha ao buscar imagem: ${response.status}`);

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const arrayBuffer = await response.arrayBuffer();
    const imageBytes = new Uint8Array(arrayBuffer);

    // Escolher o método com base no Content-Type quando possível
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      try { return await pdfDoc.embedJpg(imageBytes); } catch {}
    }
    if (contentType.includes('png')) {
      try { return await pdfDoc.embedPng(imageBytes); } catch {}
    }

    // Tentativas padrão
    try { return await pdfDoc.embedJpg(imageBytes); } catch {}
    try { return await pdfDoc.embedPng(imageBytes); } catch {}

    // Último recurso: converter para PNG via Canvas (lida com WEBP)
    if (typeof document !== 'undefined' && typeof createImageBitmap !== 'undefined') {
      try {
        const blob = new Blob([imageBytes.buffer], { type: contentType || 'image/*' });
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0);
        const pngBlob: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob falhou'))), 'image/png');
        });
        const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
        return await pdfDoc.embedPng(pngBytes);
      } catch (err) {
        console.error('Falha ao converter imagem para PNG:', err);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao carregar imagem:', error);
    return null;
  }
}

// Página 2: Descrição do Anúncio
async function generateDescriptionPage(pdfDoc: PDFDocument, data: AnuncioPDFData) {
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let yPos = height - 50;

  // Título da página
  const title = data.title
    .replace(/[\r\n]+/g, ' ') // Substituir quebras de linha por espaços
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '') // Remover caracteres não-ASCII problemáticos
    .replace(/\s+/g, ' ') // Normalizar espaços múltiplos
    .trim();
  const titleLines = wrapText(title, width - 40, fontBold, 16);

  // Desenhar até 2 linhas do título
  titleLines.slice(0, 2).forEach((line) => {
    page.drawText(line, {
      x: 20,
      y: yPos,
      size: 16,
      font: fontBold,
      color: rgb(12/255, 120/255, 177/255), // Cor #0C78B1
    });
    yPos -= 20;
  });

  // Código MLB embaixo do título
  yPos -= 5;
  const cleanMlbCode = (data.mlbCode || '')
    .replace(/[^\x20-\x7E]/g, '') // Remover caracteres não-ASCII
    .trim();
  page.drawText(cleanMlbCode, {
    x: 20,
    y: yPos,
    size: 12,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  yPos -= 25;

  // Descrição do anúncio
  page.drawText('Descrição do Anúncio:', {
    x: 20,
    y: yPos,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  yPos -= 20;

  // Usar a descrição real do anúncio ou mensagem padrão
  const descriptionText = data.description || 'Sem descrição disponível.';

  // Limpar apenas caracteres problemáticos, mas preservar quebras de linha
  const cleanedText = descriptionText
    .replace(/[^\x20-\x7E\u00A0-\u00FF\r\n]/g, '') // Remover caracteres não-ASCII problemáticos, mas manter \r\n
    .replace(/\r\n/g, '\n') // Normalizar quebras de linha para \n
    .replace(/\r/g, '\n'); // Converter \r para \n

  // Dividir em parágrafos
  // Primeiro tenta dividir por quebras de linha duplas (parágrafos),
  // se não houver, divide por quebra simples (linhas)
  let paragraphs: string[];
  if (cleanedText.includes('\n\n')) {
    // Se tem quebras duplas, usar como separador de parágrafos
    paragraphs = cleanedText.split(/\n\n+/).filter(p => p.trim());
  } else {
    // Se não tem quebras duplas, dividir por quebras simples
    paragraphs = cleanedText.split('\n').filter(p => p.trim());
  }

  paragraphs.forEach((paragraph, index) => {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) return;

    // Remover quebras de linha dentro do parágrafo (converter para espaços)
    // para que o wrapText funcione corretamente
    const cleanParagraph = trimmedParagraph
      .replace(/\n/g, ' ') // Substituir quebras de linha por espaços
      .replace(/\s+/g, ' ') // Normalizar espaços múltiplos
      .trim();

    if (!cleanParagraph) return;

    // Quebrar o parágrafo em linhas que cabem na página
    const paragraphLines = wrapText(cleanParagraph, width - 40, font, 10);

    paragraphLines.forEach((line) => {
      if (yPos < 40) return; // Não ultrapassar a margem inferior

      page.drawText(line, {
        x: 20,
        y: yPos,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      yPos -= 14;
    });

    // Adicionar espaço extra entre parágrafos (exceto no último)
    if (index < paragraphs.length - 1 && yPos >= 40) {
      yPos -= 8; // Espaço extra entre parágrafos
    }
  });

  // Footer
  page.drawText('Cyber Registro © 2025 - Página 2', {
    x: width / 2 - 60,
    y: 15,
    size: 9,
    font: font,
    color: rgb(0.47, 0.47, 0.47),
  });
}

// Página de imagem
async function generateImagePage(pdfDoc: PDFDocument, imageUrl: string, pageNumber: number, productTitle: string, mlbCode: string) {
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Título - Nome do produto (limpar caracteres problemáticos)
  const cleanTitle = productTitle
    .replace(/[\r\n]+/g, ' ') // Substituir quebras de linha por espaços
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '') // Remover caracteres não-ASCII problemáticos
    .replace(/\s+/g, ' ') // Normalizar espaços múltiplos
    .trim();
  const titleLines = wrapText(cleanTitle, width - 40, fontBold, 14);
  let titleY = height - 40;

  titleLines.slice(0, 2).forEach((line) => {
    const textWidth = fontBold.widthOfTextAtSize(line, 14);
    page.drawText(line, {
      x: (width - textWidth) / 2,
      y: titleY,
      size: 14,
      font: fontBold,
      color: rgb(12/255, 120/255, 177/255), // Cor #0C78B1
    });
    titleY -= 18;
  });

  // Código MLB embaixo do título (centralizado)
  titleY -= 5;
  const cleanMlbCode = (mlbCode || '')
    .replace(/[^\x20-\x7E]/g, '') // Remover caracteres não-ASCII
    .trim();
  const mlbWidth = font.widthOfTextAtSize(cleanMlbCode, 11);
  page.drawText(cleanMlbCode, {
    x: (width - mlbWidth) / 2,
    y: titleY,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Tentar adicionar imagem
  const embeddedImage = await embedImageSafe(pdfDoc, imageUrl);

  if (embeddedImage) {
    // Calcular dimensões mantendo proporção
    const imgDims = embeddedImage.scale(1);
    const maxWidth = width - 80;
    const maxHeight = height - 140;

    let imgWidth = imgDims.width;
    let imgHeight = imgDims.height;

    // Redimensionar se necessário
    if (imgWidth > maxWidth) {
      const scale = maxWidth / imgWidth;
      imgWidth = maxWidth;
      imgHeight = imgHeight * scale;
    }

    if (imgHeight > maxHeight) {
      const scale = maxHeight / imgHeight;
      imgHeight = maxHeight;
      imgWidth = imgWidth * scale;
    }

    // Centralizar imagem
    const x = (width - imgWidth) / 2;
    const y = (height - imgHeight) / 2 - 20;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: imgWidth,
      height: imgHeight,
    });
  } else {
    // Se não conseguir carregar a imagem, mostrar mensagem
    page.drawText('Imagem não disponível', {
      x: width / 2 - 60,
      y: height / 2,
      size: 12,
      font: font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  // Footer
  page.drawText(`Cyber Registro © 2025 - Página ${pageNumber}`, {
    x: width / 2 - 70,
    y: 15,
    size: 9,
    font: font,
    color: rgb(0.47, 0.47, 0.47),
  });
}

export async function generateAnuncioPDF(data: AnuncioPDFData): Promise<void> {
  try {
    // Buscar o PDF da capa
    const capaResponse = await fetch('/capa.pdf');
    const capaBytes = await capaResponse.arrayBuffer();

    // Carregar o PDF da capa
    const capaPdf = await PDFDocument.load(capaBytes);

    // Criar novo PDF
    const pdfDoc = await PDFDocument.create();

    // Copiar a primeira página da capa
    const [capaPage] = await pdfDoc.copyPages(capaPdf, [0]);
    pdfDoc.addPage(capaPage);

    // Página 2: Descrição
    await generateDescriptionPage(pdfDoc, data);

    // Páginas de imagens - TODAS as imagens do anúncio
    if (data.pictures && data.pictures.length > 0) {
      for (let i = 0; i < data.pictures.length; i++) {
        const imageUrl = data.pictures[i].url || data.pictures[i].secure_url;
        if (imageUrl) {
          await generateImagePage(pdfDoc, imageUrl, i + 3, data.title, data.mlbCode);
        }
      }
    }

    // Salvar e baixar o PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.mlbCode}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
}

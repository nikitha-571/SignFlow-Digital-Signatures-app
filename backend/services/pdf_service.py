import fitz
import os
from datetime import datetime
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import logging

logger = logging.getLogger(__name__)


def create_signature_image_from_text(text: str, width: int, height: int, font_name: str = "cursive",
                                     signature_type: str = "signature"):

    img = Image.new('RGBA', (width, height), color=(255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    if signature_type == "initials":
        font_size = int(height * 0.8)
    elif signature_type == "date" or signature_type == "text":
        font_size = int(height * 0.4)
    else:
        font_size = int(height * 0.6)

    try:
        font_paths = [
            "C:/Windows/Fonts/BRUSHSCI.TTF",
            "C:/Windows/Fonts/FREESCPT.TTF",
            "C:/Windows/Fonts/MISTRAL.TTF",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
            "/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf",
        ]

        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, font_size)
                    break
                except:
                    continue

        if not font:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = (width - text_width) // 2
    y = (height - text_height) // 2

    draw.text((x, y), text, fill='black', font=font)

    img_bytes = BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)

    return img_bytes.getvalue()


def generate_signed_pdf(original_pdf_path: str, signatures: list, output_path: str = None):

    try:
        logger.info(f"Starting PDF generation for: {original_pdf_path}")

        doc = fitz.open(original_pdf_path)
        logger.info(f"PDF opened successfully. Pages: {len(doc)}")

        signed_count = 0

        for sig in signatures:
            if sig.status != "signed":
                logger.debug(f"Skipping signature {sig.id} - status: {sig.status}")
                continue

            page_num = sig.page_number - 1
            if page_num >= len(doc):
                logger.warning(f"Page {sig.page_number} out of range for signature {sig.id}")
                continue

            page = doc[page_num]
            page_rect = page.rect

            x = sig.x_position * page_rect.width
            y = sig.y_position * page_rect.height
            width = sig.width * page_rect.width
            height = sig.height * page_rect.height

            sig_rect = fitz.Rect(x, y, x + width, y + height)
            try:

                if sig.signature_image_path and os.path.exists(sig.signature_image_path):
                    logger.info(f"Inserting hand-drawn signature from: {sig.signature_image_path}")
                    page.insert_image(sig_rect, filename=sig.signature_image_path)
                    signed_count += 1

                elif sig.signature_text:
                    logger.info(f"Creating text signature: {sig.signature_text}")

                    sig_image_bytes = create_signature_image_from_text(
                        sig.signature_text,
                        int(width),
                        int(height),
                        sig.signature_font or "cursive",
                        sig.signature_type or "signature"
                    )

                    page.insert_image(sig_rect, stream=sig_image_bytes)
                    signed_count += 1
                    logger.info(f"Placed text sig {sig.id} on page {sig.page_number}")

                else:
                    logger.warning(f"Sig {sig.id} has no image or text - skipping")

            except Exception as e:
                logger.error(f"Error processing signature {sig.id}: {str(e)}")
                continue

        logger.info(f"Processed {signed_count} signatures")

        if not output_path:
            base_name = os.path.splitext(original_pdf_path)[0]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"{base_name}_signed_{timestamp}.pdf"

        doc.save(output_path, garbage=4, deflate=True, clean=True)
        doc.close()

        logger.info(f"Signed PDF saved to: {output_path}")

        return output_path

    except Exception as e:
        logger.error(f"Failed to generate signed PDF: {str(e)}")
        raise Exception(f"Failed to generate signed PDF: {str(e)}")
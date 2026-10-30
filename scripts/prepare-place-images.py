"""Create small local variants and review sheets from the approved import."""
import json
import hashlib
import html
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

root = Path('.cache/place-photos')
records = json.loads((root / 'records.json').read_text(encoding='utf-8'))
output = Path('client/public/destinations/places')
output.mkdir(parents=True, exist_ok=True)
for record in records:
    with Image.open(root / 'raw' / record['id']) as raw:
        image = ImageOps.exif_transpose(raw).convert('RGB')
        image.thumbnail((1000, 750))
        metadata = f'<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" dc:source="{html.escape(record["source"], quote=True)}" dc:creator="{html.escape(record["creator"], quote=True)}" dc:rights="{html.escape(record["license"], quote=True)}" dc:title="{html.escape(record["title"], quote=True)}" /></rdf:RDF></x:xmpmeta>'.encode('utf-8')
        image.save(output / f"{record['id']}.webp", quality=78, xmp=metadata)
        record['width'], record['height'] = image.size
        thumb = ImageOps.fit(image, (240, 180))
        thumb.save(output / f"{record['id']}-thumb.webp", quality=74, xmp=metadata)
    record['file'] = f"/destinations/places/{record['id']}.webp"
    record['thumbnail'] = f"/destinations/places/{record['id']}-thumb.webp"
    record['modifications'] = 'Resized and converted to WebP; thumbnail cropped. Derivatives retain the source license.'
    if isinstance(record.get('override'), dict):
        record['alt'] = record['override'].get('alt', record['alt'])
    record['sha256'] = hashlib.sha256((output / f"{record['id']}.webp").read_bytes()).hexdigest()
reviews_path = Path('scripts/place-image-review.json')
reviews = json.loads(reviews_path.read_text(encoding='utf-8')) if reviews_path.exists() else {}
for record in records:
    record['reviewed'] = reviews.get(record['id']) == record['title']
    record.pop('candidates', None)
Path('client/public/destinations/places.json').write_text(json.dumps({'version': 1, 'images': records}, indent=2), encoding='utf-8')
credits = ['# Destination image attribution', '', 'The places/ WebP files are resized derivatives; thumbnails are cropped. Each image and its derivatives retain the source license shown below. Image licenses are separate from application-code licensing. XMP origin/creator/license metadata is embedded in each WebP.', '', 'Nea Chora uses a CC BY-NC-SA 2.0 photograph: noncommercial use only. Other attraction photographs use the licenses recorded per image. The application currently demonstrates simulated travel reservations for educational use.', '', '## Attraction photographs', '']
for record in sorted(records, key=lambda item: item['id']):
    credits.append(f'- **{record["name"]}** — {record["title"]}; {record["creator"]}; [{record["license"]}]({record["licenseUrl"]}); [source]({record["source"]}). Local file: `{record["file"]}`. Resized/converted; thumbnail cropped.')
credits.extend(['', '## Country photographs', '', 'The pre-existing ten country photographs retain their separate credits in attribution.json. They are representative destination images, never photographs of fictional properties.', ''])
Path('client/public/destinations/README.md').write_text('\n'.join(credits), encoding='utf-8')
for start in range(0, len(records), 20):
    sheet = Image.new('RGB', (1200, 1150), 'white')
    draw = ImageDraw.Draw(sheet)
    for index, record in enumerate(records[start:start+20]):
        x, y = (index % 4) * 300, (index // 4) * 230
        with Image.open(root / 'raw' / record['id']) as raw:
            photo = ImageOps.fit(ImageOps.exif_transpose(raw).convert('RGB'), (290, 180))
        sheet.paste(photo, (x, y))
        draw.text((x+4, y+184), f"{start+index+1}: {record['name']}"[:47], fill='black')
        draw.text((x+4, y+203), record['title'].replace('File:', '')[:47], fill='black')
    sheet.save(root / f'review-{start//20+1}.jpg')
print(f'Prepared {len(records)} images and {(len(records)+19)//20} review sheets')

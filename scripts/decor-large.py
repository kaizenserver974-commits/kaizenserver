# Construit un décor large 1920x1080 à partir de l'image portrait du monde :
# le personnage net à droite, le décor prolongé vers la gauche (bande gauche en miroir, floutée).
import sys
from PIL import Image, ImageFilter, ImageOps
src, dst = sys.argv[1], sys.argv[2]
W, H = 1920, 1080
im = Image.open(src).convert("RGB")
m = int(im.width * 0.035)
im = im.crop((m, 0, im.width - m, im.height))  # retire le liseré sombre des bords
pw = round(im.width * H / im.height)          # 720
p = im.resize((pw, H), Image.LANCZOS)
x0 = W - pw                                    # personnage contre le bord droit
bande = p.crop((0, 0, int(pw * 0.24), H))      # décor sans personnage (côté gauche)
bande_d = p.crop((int(pw * 0.80), 0, pw, H))   # décor côté droit
canvas = Image.new("RGB", (W, H))
# Remplissage gauche : bandes en miroir successives
x, flip = x0, True
while x > 0:
    t = ImageOps.mirror(bande) if flip else bande
    x -= t.width
    canvas.paste(t, (x, 0))
    flip = not flip
canvas.paste(p, (x0, 0))
canvas.paste(bande_d, (x0 + pw, 0))
canvas.paste(ImageOps.mirror(bande_d), (x0 + pw + bande_d.width, 0))
gauche = canvas.filter(ImageFilter.GaussianBlur(7))
# Fondu progressif entre le décor prolongé et l'image nette
masque = Image.new("L", (W, H), 0)
px = masque.load()
for xx in range(W):
    if xx < x0: v = 0
    elif xx < x0 + 140: v = int(255 * (xx - x0) / 140)
    elif xx < x0 + pw - 60: v = 255
    elif xx < x0 + pw: v = int(255 * (x0 + pw - xx) / 60)
    else: v = 0
    for yy in range(H): px[xx, yy] = v
net = Image.new("RGB", (W, H)); net.paste(p, (x0, 0))
out = Image.composite(net, gauche, masque)
out.save(dst, "WEBP", quality=80, method=6)

"""Assemble review.html (the claude.ai review page) from src/ so it shares the TV's exact renderer."""
import base64, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
s = (R / "src/review.html").read_text()
logo = "data:image/png;base64," + base64.b64encode((R / "media/logo.png").read_bytes()).decode()
for k, f in [("/*TV_CSS*/", "src/tv.css"), ("/*REVIEW_CSS*/", "src/review.css"), ("/*QRCODE_JS*/", "lib/qrcode.js"),
             ("/*RENDER_JS*/", "src/render.js"), ("/*REVIEW_JS*/", "src/review_app.js")]:
    assert k in s, k
    s = s.replace(k, (R / f).read_text().replace("</script", "<\\/script"))
s = s.replace("/*LOGO*/", logo)
out = R / "dist/review.html"; out.parent.mkdir(exist_ok=True); out.write_text(s)
print(out, len(s))

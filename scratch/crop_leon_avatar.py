from PIL import Image

son_path = "frontend/public/son.jpg"
avatar_path = "frontend/public/leon_avatar.png"

try:
    img = Image.open(son_path)
    w, h = img.size
    print(f"Original image format: {img.format}, dimensions: {w}x{h}")

    # Crop to 768x768 with top offset = 160px
    left = 0
    top = 160
    right = 768
    bottom = 928

    cropped_img = img.crop((left, top, right, bottom))
    # Resize to a premium standard high-res square icon size (512x512)
    resized_img = cropped_img.resize((512, 512), Image.Resampling.LANCZOS)
    
    # Save as PNG overwriting leon_avatar.png
    resized_img.save(avatar_path, "PNG")
    print(f"Success! Saved cropped 512x512 Leon scout avatar (top: 160) to {avatar_path}")
except Exception as e:
    print(f"Error during avatar processing: {e}")

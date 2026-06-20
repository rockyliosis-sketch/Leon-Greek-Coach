from PIL import Image

son_path = "frontend/public/son.jpg"
avatar_path = "frontend/public/leon_avatar.png"

try:
    img = Image.open(son_path)
    w, h = img.size
    print(f"Original image format: {img.format}, dimensions: {w}x{h}")

    # Crop to center square
    min_side = min(w, h)
    left = (w - min_side) // 2
    top = (h - min_side) // 2
    right = left + min_side
    bottom = top + min_side

    # Let's adjust top a bit if the face is higher, but standard center crop is:
    # left = 0, top = 128, right = 768, bottom = 896
    cropped_img = img.crop((left, top, right, bottom))
    # Resize to a premium standard high-res square icon size (512x512)
    resized_img = cropped_img.resize((512, 512), Image.Resampling.LANCZOS)
    
    # Save as PNG overwriting leon_avatar.png
    resized_img.save(avatar_path, "PNG")
    print(f"Success! Saved cropped 512x512 Leon scout avatar to {avatar_path}")
except Exception as e:
    print(f"Error during avatar processing: {e}")

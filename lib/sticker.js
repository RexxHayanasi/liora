import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { Sticker, StickerTypes } from "wa-sticker-formatter";

const execFileAsync = promisify(execFile);

async function sticker(
    { filename, mime, ext },
    { packName = "", authorName = "", crop = false, fps = 15, duration = 30 } = {}
) {
    if (!filename) return Buffer.alloc(0);

    const isVideo =
        /^video\//.test(mime) ||
        ["mp4", "webm", "mkv", "mov", "avi"].includes((ext || "").toLowerCase()) ||
        mime === "image/gif";

    const fpsSafe = Math.max(1, Math.min(Number.isFinite(fps) ? fps : 15, 30));
    const durSafe = Math.max(1, Math.min(Number.isFinite(duration) ? duration : 30, 30));
    const outPath = filename.replace(/\.[^/.]+$/, "") + ".webp";

    const vf = crop
        ? `scale=512:512:force_original_aspect_ratio=increase,crop=512:512`
        : `scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=black@0`;

    const args = [
        "-y",
        "-i",
        filename,
        "-vf",
        isVideo ? `${vf},fps=${fpsSafe},format=yuva420p` : `${vf},format=yuva420p`,
        "-vcodec",
        "libwebp",
        "-compression_level",
        "6",
    ];

    if (isVideo) {
        args.push("-t", String(durSafe), "-an", "-preset", "picture", "-q:v", "70", outPath);
    } else {
        args.push("-frames:v", "1", "-preset", "picture", "-q:v", "70", outPath);
    }

    await execFileAsync("ffmpeg", args);
    const buffer = await fs.readFile(outPath);

    const sticker = new Sticker(buffer, {
        pack: packName,
        author: authorName,
        type: isVideo ? StickerTypes.FULL : StickerTypes.CROPPED,
        quality: 70,
    });

    return await sticker.build();
}

async function fakechat(text, name, avatar, url = false, isHD = false) {
    let body = {
        type: "quote",
        format: "png",
        backgroundColor: "#FFFFFF",
        width: isHD ? 1024 : 512,
        height: isHD ? 1536 : 768,
        scale: isHD ? 4 : 2,
        messages: [
            {
                entities: [],
                media: url ? { url: url } : null,
                avatar: true,
                from: {
                    id: 1,
                    name: name,
                    photo: {
                        url: avatar,
                    },
                },
                text: text,
                replyMessage: {},
            },
        ],
    };

    let response = await fetch("https://btzqc.betabotz.eu.org/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    let { result } = await response.json();
    return Buffer.from(result.image, "base64");
}

export { sticker, fakechat };

import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { generateCaption } from "./src/lib/gemini.ts";
import { getSupabase } from "./src/lib/supabase.ts";
import { checkAndRefreshToken, publishInstagramCarousel } from "./src/lib/instagram.ts";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up directory variables for ES modules
const __dirname = path.resolve();

// Support large image payloads (for base64 carousel slides)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Dynamic absolute path to standard server static uploads
const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/public/uploads", express.static(uploadsDir));

// Create a local backup database file for a wonderful zero-config preview out-of-the-box!
const DB_FILE = path.join(__dirname, "db.json");
function readLocalDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { posts: [], config: { instagram_access_token: "TOKEN_ANDA_DI_SINI" } };
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    return { posts: [], config: { instagram_access_token: "TOKEN_ANDA_DI_SINI" } };
  }
}

function writeLocalDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Local database write failed", err);
  }
}

// ----------------- BACKEND API ENTRANTS -----------------

/**
 * 1. Upload Base64 PNG carousel images
 * POST /api/upload
 */
app.post("/api/upload", async (req, res) => {
  try {
    const { images } = req.body; // array of base64 strings: ["data:image/png;base64,...", ...]
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "No image raw data supplied." });
    }

    const uploadedUrls: string[] = [];
    const supabase = getSupabase();

    for (let i = 0; i < images.length; i++) {
      const base64Str = images[i];
      const match = base64Str.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) {
        throw new Error(`Format gambar ke-${i+1} tidak valid (harus base64 png/jpg).`);
      }

      const extension = match[1];
      const dataBuffer = Buffer.from(match[2], "base64");
      const filename = `slide-${Date.now()}-${i}-${Math.round(Math.random() * 100000)}.${extension}`;

      if (supabase) {
        // Attempt Supabase Storage Upload if client is active
        const { data, error } = await supabase.storage
          .from("carousel-slides")
          .upload(filename, dataBuffer, {
            contentType: `image/${extension}`,
            upsert: true,
          });

        if (error) {
          console.error("Supabase file upload error. Retrying with local uploads fallback...", error);
          // Fallback locally
          const localPath = path.join(uploadsDir, filename);
          fs.writeFileSync(localPath, dataBuffer);
          const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
          uploadedUrls.push(`${appUrl}/public/uploads/${filename}`);
        } else {
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from("carousel-slides")
            .getPublicUrl(filename);
          uploadedUrls.push(publicUrlData.publicUrl);
        }
      } else {
        // Save to Local uploads
        const localPath = path.join(uploadsDir, filename);
        fs.writeFileSync(localPath, dataBuffer);
        const appUrl = (process.env.APP_URL || "").replace(/\/$/, "") || `http://localhost:${PORT}`;
        uploadedUrls.push(`${appUrl}/public/uploads/${filename}`);
      }
    }

    res.json({ urls: uploadedUrls });
  } catch (error: any) {
    console.error("Upload handler crash:", error);
    res.status(500).json({ error: error.message || "Failed uploading files" });
  }
});

/**
 * 2. Generate Caption calling Gemini API AI
 * POST /api/generate-caption
 */
app.post("/api/generate-caption", async (req, res) => {
  try {
    const { contentDescription } = req.body;
    if (!contentDescription) {
      return res.status(400).json({ error: "Deskripsi konten wajib diisi." });
    }

    const caption = await generateCaption(contentDescription);
    res.json({ caption });
  } catch (error: any) {
    console.error("Caption generation crash:", error);
    res.status(500).json({ error: error.message || "AI Caption generation failed" });
  }
});

/**
 * 3. Schedule target Instagram post
 * POST /api/schedule
 */
app.post("/api/schedule", async (req, res) => {
  try {
    const { scheduled_at, caption, image_urls, frequency } = req.body;
    if (!scheduled_at || !image_urls || image_urls.length === 0) {
      return res.status(400).json({ error: "Tanggal posting & Gambar wajib diisi." });
    }

    const newPost = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      scheduled_at: new Date(scheduled_at).toISOString(),
      caption: caption || "",
      image_urls,
      status: "scheduled",
      frequency: frequency || "once",
    };

    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("scheduled_posts")
        .insert([newPost])
        .select()
        .single();

      if (error) {
        throw error;
      }
      return res.json(data);
    } else {
      // Save in Local DB Store
      const local = readLocalDB();
      local.posts.push(newPost);
      writeLocalDB(local);
      return res.json(newPost);
    }
  } catch (error: any) {
    console.error("Schedule creation failed:", error);
    res.status(500).json({ error: error.message || "Gagal menyimpan jadwal" });
  }
});

/**
 * 4. Get active posts lists (All statuses)
 * GET /api/posts
 */
app.get("/api/posts", async (req, res) => {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("scheduled_posts")
        .select("*")
        .order("scheduled_at", { ascending: false });

      if (!error) {
        return res.json(data || []);
      }
      console.warn("Supabase load failed, falling back to local database.", error);
    }

    const local = readLocalDB();
    res.json(local.posts.sort((a: any, b: any) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()));
  } catch (error: any) {
    res.status(500).json({ error: "Gagal memuat jadwal posting." });
  }
});

/**
 * 5. Update schedules (Reschedule)
 * PATCH /api/posts/:id
 */
app.patch("/api/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_at } = req.body;

    if (!scheduled_at) {
      return res.status(400).json({ error: "Waktu penjadwalan baru harus disertakan." });
    }

    const targetDate = new Date(scheduled_at).toISOString();
    const supabase = getSupabase();

    if (supabase) {
      const { data, error } = await supabase
        .from("scheduled_posts")
        .update({ scheduled_at: targetDate, status: "scheduled", error_message: null })
        .eq("id", id)
        .select()
        .single();

      if (!error) {
        return res.json(data);
      }
    }

    const local = readLocalDB();
    const index = local.posts.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      local.posts[index].scheduled_at = targetDate;
      local.posts[index].status = "scheduled";
      local.posts[index].error_message = undefined;
      writeLocalDB(local);
      return res.json(local.posts[index]);
    }

    res.status(404).json({ error: "Jadwal posting tidak ditemukan." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Gagal mengubah jadwal." });
  }
});

/**
 * 6. Cancel schedule (Delete post entry)
 * DELETE /api/posts/:id
 */
app.delete("/api/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabase();

    if (supabase) {
      const { error } = await supabase
        .from("scheduled_posts")
        .delete()
        .eq("id", id);

      if (!error) {
        return res.json({ success: true, message: "Jadwal posting berhasil dibatalkan." });
      }
    }

    const local = readLocalDB();
    const beforeLength = local.posts.length;
    local.posts = local.posts.filter((p: any) => p.id !== id);
    if (local.posts.length < beforeLength) {
      writeLocalDB(local);
      return res.json({ success: true, message: "Jadwal posting berhasil dibatalkan." });
    }

    res.status(404).json({ error: "Jadwal posting tidak ditemukan." });
  } catch (error: any) {
    res.status(500).json({ error: "Gagal menghapus jadwal posting." });
  }
});

/**
 * EXTRA: Token Config Management
 * GET /api/token
 * POST /api/token
 */
app.get("/api/token", async (req, res) => {
  const supabase = getSupabase();
  let token = "TOKEN_ANDA_DI_SINI";

  if (supabase) {
    const { data } = await supabase.from("app_config").select("value").eq("key", "instagram_access_token").single();
    if (data) token = data.value;
  } else {
    const local = readLocalDB();
    token = local.config?.instagram_access_token || token;
  }

  const { status } = await checkAndRefreshToken(supabase);
  res.json({ token, status });
});

app.post("/api/token", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token is required" });

  const supabase = getSupabase();
  if (supabase) {
    await supabase.from("app_config").upsert({ key: "instagram_access_token", value: token, updated_at: new Date().toISOString() });
  } else {
    const local = readLocalDB();
    local.config = local.config || {};
    local.config.instagram_access_token = token;
    writeLocalDB(local);
  }

  res.json({ success: true, message: "Token berhasil disimpan" });
});

/**
 * 7. Cron Endpoint - Execute Scheduled Posts due immediately
 * POST /api/cron/check-schedule
 */
app.all("/api/cron/check-schedule", async (req, res) => {
  // Option to dry run/bypass auth for development debugging Comfort
  const authHeader = req.headers["authorization"] || "";
  const querySecret = req.query.secret;
  const cronSecret = process.env.CRON_SECRET || "cron_secret_123";

  if (process.env.NODE_ENV === "production" && cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
    return res.status(401).json({ error: "Security validation failed. CRON_SECRET mismatch." });
  }

  const supabase = getSupabase();
  const now = new Date();
  let postsToExecute: any[] = [];
  let dbClient: any = supabase;

  console.log(`⏱️ Cron Triggered at ${now.toISOString()}. Querying due posts...`);

  // Fetch all posts where status === scheduled && scheduled_at <= current time
  if (supabase) {
    const { data, error } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now.toISOString());

    if (!error && data) {
      postsToExecute = data;
    }
  } else {
    const local = readLocalDB();
    postsToExecute = local.posts.filter(
      (p: any) => p.status === "scheduled" && new Date(p.scheduled_at) <= now
    );
  }

  const results: any[] = [];

  if (postsToExecute.length === 0) {
    console.log("Empty queue. No scheduled carousels due.");
    return res.json({ message: "No posts due for publication.", executed: 0 });
  }

  // Check & automatically rotate Instagram token beforehand
  const { token: validatedToken } = await checkAndRefreshToken(supabase);
  const instagramUserId = process.env.INSTAGRAM_USER_ID || "178414000000000"; // default placeholder page id

  for (const post of postsToExecute) {
    try {
      console.log(`Publishing post ${post.id} with ${post.image_urls.length} images...`);
      
      const postId = await publishInstagramCarousel({
        imageUrls: post.image_urls,
        caption: post.caption,
        instagramUserId,
        accessToken: validatedToken,
      });

      // Update publishing success status
      const updatedValues = {
        status: "posted",
        instagram_post_id: postId,
        error_message: null,
      };

      if (supabase) {
        await supabase.from("scheduled_posts").update(updatedValues).eq("id", post.id);
      } else {
        const local = readLocalDB();
        const idx = local.posts.findIndex((p: any) => p.id === post.id);
        if (idx !== -1) {
          local.posts[idx] = { ...local.posts[idx], ...updatedValues };
          writeLocalDB(local);
        }
      }

      // Handle recurrence patterns (daily/weekly)
      if (post.frequency === "daily" || post.frequency === "weekly") {
        const nextDate = new Date(post.scheduled_at);
        if (post.frequency === "daily") nextDate.setDate(nextDate.getDate() + 1);
        if (post.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);

        const recurringPost = {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          scheduled_at: nextDate.toISOString(),
          caption: post.caption,
          image_urls: post.image_urls,
          status: "scheduled",
          frequency: post.frequency,
        };

        if (supabase) {
          await supabase.from("scheduled_posts").insert([recurringPost]);
        } else {
          const local = readLocalDB();
          local.posts.push(recurringPost);
          writeLocalDB(local);
        }
        console.log(`🔁 Cloned daily/weekly post for recurring date: ${nextDate.toISOString()}`);
      }

      results.push({ id: post.id, status: "posted", instagram_post_id: postId });
    } catch (err: any) {
      console.error(`Failed to publish carousel ${post.id}:`, err);
      // Mark as failed
      const failureValues = {
        status: "failed",
        error_message: err.message || "Dynamic posting timeout expired",
      };

      if (supabase) {
        await supabase.from("scheduled_posts").update(failureValues).eq("id", post.id);
      } else {
        const local = readLocalDB();
        const idx = local.posts.findIndex((p: any) => p.id === post.id);
        if (idx !== -1) {
          local.posts[idx] = { ...local.posts[idx], ...failureValues };
          writeLocalDB(local);
        }
      }

      results.push({ id: post.id, status: "failed", error: err.message });
    }
  }

  res.json({ message: "Schedules checked.", processed: postsToExecute.length, details: results });
});

// Run a background interval running check-schedule every 12 seconds in preview inside AI Studio environment,
// ensuring the auto-poster processes things immediately for the user during preview testing!
setInterval(async () => {
  try {
    const supabase = getSupabase();
    const now = new Date();
    let postsToExecute: any[] = [];
    if (supabase) {
      const { data } = await supabase
        .from("scheduled_posts")
        .select("*")
        .eq("status", "scheduled")
        .lte("scheduled_at", now.toISOString());
      if (data && data.length > 0) postsToExecute = data;
    } else {
      const local = readLocalDB();
      postsToExecute = local.posts.filter((p: any) => p.status === "scheduled" && new Date(p.scheduled_at) <= now);
    }

    if (postsToExecute.length > 0) {
      console.log("Background interval worker caught upcoming posts. Invoking internal trigger...");
      // Auto-refresh token
      const { token: validatedToken } = await checkAndRefreshToken(supabase);
      const instagramUserId = process.env.INSTAGRAM_USER_ID || "178414000000000";

      for (const post of postsToExecute) {
        try {
          const postId = await publishInstagramCarousel({
            imageUrls: post.image_urls,
            caption: post.caption,
            instagramUserId,
            accessToken: validatedToken,
          });

          const updateSuccess = { status: "posted", instagram_post_id: postId, error_message: null };
          if (supabase) {
            await supabase.from("scheduled_posts").update(updateSuccess).eq("id", post.id);
          } else {
            const local = readLocalDB();
            const idx = local.posts.findIndex((p: any) => p.id === post.id);
            if (idx !== -1) {
              local.posts[idx] = { ...local.posts[idx], ...updateSuccess };
              writeLocalDB(local);
            }
          }

          if (post.frequency === "daily" || post.frequency === "weekly") {
            const nextDate = new Date(post.scheduled_at);
            if (post.frequency === "daily") nextDate.setDate(nextDate.getDate() + 1);
            if (post.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);

            const recurringClone = {
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
              scheduled_at: nextDate.toISOString(),
              caption: post.caption,
              image_urls: post.image_urls,
              status: "scheduled",
              frequency: post.frequency,
            };

            if (supabase) {
              await supabase.from("scheduled_posts").insert([recurringClone]);
            } else {
              const local = readLocalDB();
              local.posts.push(recurringClone);
              writeLocalDB(local);
            }
          }
        } catch (err: any) {
          console.error("Background runner errored on item:", post.id, err);
          const updateFail = { status: "failed", error_message: err.message || "Simulated publish failure" };
          if (supabase) {
            await supabase.from("scheduled_posts").update(updateFail).eq("id", post.id);
          } else {
            const local = readLocalDB();
            const idx = local.posts.findIndex((p: any) => p.id === post.id);
            if (idx !== -1) {
              local.posts[idx] = { ...local.posts[idx], ...updateFail };
              writeLocalDB(local);
            }
          }
        }
      }
    }
  } catch (err) {
    // catch-all silent logging
  }
}, 12000);

// Serving built React client-side SPA
app.use(express.static(path.join(__dirname, "dist")));

// If URL has no match, serve React Router app wrapper
app.get("*", (req, res) => {
  const reactIndex = path.join(__dirname, "dist", "index.html");
  if (fs.existsSync(reactIndex)) {
    res.sendFile(reactIndex);
  } else {
    res.setHeader("Content-Type", "text/html");
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>InstaAuto - Starting Up</title>
          <style>
            body { background: #0f0f0f; color: #a1a1aa; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .box { text-align: center; border: 1px solid rgba(255,255,255,0.1); padding: 30px; border-radius: 12px; background: #141414; }
            h2 { color: #fff; margin-bottom: 10px; }
            .spinner { border: 3px solid rgba(255,255,255,0.1); width: 32px; height: 32px; border-radius: 50%; border-left-color: #833AB4; animation: spin 1s linear infinite; margin: 15px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="spinner"></div>
            <h2>Sistem Sedang Mempersiapkan Berkas...</h2>
            <p>Aplikasi sedang dikompilasi oleh AI dan siap sesaat lagi. Mohon segarkan halaman dalam beberapa detik.</p>
          </div>
          <script>
            setTimeout(() => window.location.reload(), 3000);
          </script>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`💻 Full Stack Backend running on port ${PORT}!`);
});

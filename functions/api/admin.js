// 管理画面用の合言葉
const ADMIN_PASSWORD = "shimaadmin1432";

export async function onRequest(context) {
  // CORS（開発中のエラー回避）の設定
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json;charset=UTF-8"
  };

  // プリフライト（OPTIONS）リクエストへの即時返答
  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POSTリクエスト以外は受け付けない
  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const body = await context.request.json();
    const { password, action, type, data } = body;

    // 🔑 合言葉のチェック（ここで不正なアクセスを弾きます）
    if (password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "合言葉が正しくありません。" }), { status: 403, headers: corsHeaders });
    }

    // 🗄️ 1. カテゴリ（categories）に関する処理
    if (type === "category") {
      if (action === "add") {
        // 新規追加
        await context.env.DB
          .prepare("INSERT INTO categories (name, display_order) VALUES (?, ?)")
          .bind(data.name, data.display_order || 0)
          .run();
        return new Response(JSON.stringify({ success: true, message: "カテゴリを追加しました" }), { headers: corsHeaders });
      } 
      
      if (action === "update") {
        // 編集
        await context.env.DB
          .prepare("UPDATE categories SET name = ?, display_order = ? WHERE id = ?")
          .bind(data.name, data.display_order, data.id)
          .run();
        return new Response(JSON.stringify({ success: true, message: "カテゴリを更新しました" }), { headers: corsHeaders });
      }

      if (action === "delete") {
        // 削除（紐づくカードも連動して消す場合は注意）
        await context.env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(data.id).run();
        await context.env.DB.prepare("DELETE FROM cards WHERE category_id = ?").bind(data.id).run(); // 紐づくカードも削除
        return new Response(JSON.stringify({ success: true, message: "カテゴリと所属するカードを削除しました" }), { headers: corsHeaders });
      }
    }

    // 🎴 2. カード（cards）に関する処理
    if (type === "card") {
      if (action === "add") {
        // 新規追加
        await context.env.DB
          .prepare("INSERT INTO cards (category_id, name, expiry_date, code, display_order) VALUES (?, ?, ?, ?, ?)")
          .bind(data.category_id, data.name, data.expiry_date, data.code, data.display_order || 0)
          .run();
        return new Response(JSON.stringify({ success: true, message: "カードを追加しました" }), { headers: corsHeaders });
      }

      if (action === "update") {
        // 編集
        await context.env.DB
          .prepare("UPDATE cards SET category_id = ?, name = ?, expiry_date = ?, code = ?, display_order = ? WHERE id = ?")
          .bind(data.category_id, data.name, data.expiry_date, data.code, data.display_order, data.id)
          .run();
        return new Response(JSON.stringify({ success: true, message: "カード情報を更新しました" }), { headers: corsHeaders });
      }

      if (action === "delete") {
        // 削除
        await context.env.DB.prepare("DELETE FROM cards WHERE id = ?").bind(data.id).run();
        return new Response(JSON.stringify({ success: true, message: "カードを削除しました" }), { headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action or type" }), { status: 400, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}
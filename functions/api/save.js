export async function onRequest(context) {
  // 安全のため、POSTメソッド以外は受け付けない
  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 1. フロント（管理画面）から送られてきたデータを解析
    const { season_id, stage, stats } = await context.request.json();

    if (!season_id || !stage || !stats || !Array.isArray(stats)) {
      return new Response(JSON.stringify({ error: "入力データが不正です" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. D1の「バッチ処理（一括実行）」を使って、安全に高速処理する準備
    const statements = [];

    // 既存のデータを上書きしやすくするため、まず選択されたシーズン・ステージの古いデータを一旦削除するSQLを用意
    statements.push(
      context.env.DB.prepare(
        "DELETE FROM team_season_stats WHERE season_id = ? AND stage = ?"
      ).bind(season_id, stage)
    );

    // 3. 画面で入力された全チーム分のデータを、1チームずつ挿入するSQLに展開
    for (const item of stats) {
      statements.push(
        context.env.DB.prepare(`
          INSERT INTO team_season_stats (season_id, team_id, stage, total_point, rank)
          VALUES (?, ?, ?, ?, ?)
        `).bind(season_id, item.team_id, stage, item.total_point, item.rank)
      );
    }

    // 4. 用意したすべてのSQLを一挙に実行！（トランザクション処理）
    // 万が一途中でエラーが起きても、自動で元の状態に巻き戻してくれるので安全です。
    await context.env.DB.batch(statements);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 
        "Content-Type": "application/json;charset=UTF-8",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
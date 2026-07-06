export async function onRequest(context) {
  try {
    // 1. URLのパラメータから「シーズンID」と「ステージ」を取得する
    // 例: /api/data?season_id=2&stage=レギュラー
    const url = new URL(context.request.url);
    const seasonId = url.searchParams.get('season_id');
    const stage = url.searchParams.get('stage') || 'レギュラー';

    // 2. まずは「シーズン一覧」をすべて取得（画面の年度切り替えタブ用）
    // 開始年（start_year）の新しい順（降順）に並べる
    const { results: seasons } = await context.env.DB
      .prepare("SELECT * FROM seasons ORDER BY start_year DESC")
      .all();

    // 3. 選択されたシーズンID、または最新のシーズンIDを決定する
    // パラメータがなければ、一番開始年が新しいシーズンのIDを使う
    const currentSeasonId = seasonId ? Number(seasonId) : (seasons[0]?.id || null);

    let stats = [];
    if (currentSeasonId) {
      // 4. 【ここがポイント！】指定されたシーズンとステージのチーム成績を取得
      // JOIN（結合）を使って、teamsテーブルからロゴやXのアカウントも一緒に引っこ抜く！
      // 成績（順位 rank）の正しい順（1位から昇順）に並べる
      const { results } = await context.env.DB
        .prepare(`
          SELECT 
            stats.id AS stats_id,
            stats.total_point,
            stats.rank,
            stats.stage,
            t.id AS team_id,
            t.name AS team_name,
            t.short_name,
            t.logo_url,
            t.x_username,
            t.joined_year
          FROM team_season_stats stats
          JOIN teams t ON stats.team_id = t.id
          WHERE stats.season_id = ? AND stats.stage = ?
          ORDER BY stats.rank ASC
        `)
        .bind(currentSeasonId, stage)
        .all();
      
      stats = results;
    }

    // 5. 画面（React）が扱いやすいように綺麗に形を整えて返却する
    const responseData = {
      seasons: seasons,             // 全シーズンリスト
      currentSeasonId: currentSeasonId, // いま表示しているシーズンID
      currentStage: stage,          // いま表示しているステージ
      teamStats: stats              // その条件にマッチしたチーム成績一覧
    };

    return new Response(JSON.stringify(responseData), {
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
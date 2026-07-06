import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [seasons, setSeasons] = useState([]);
  const [currentSeasonId, setCurrentSeasonId] = useState('');
  const [currentStage, setCurrentStage] = useState('レギュラー');
  const [teamStats, setTeamStats] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔐 管理者モードの判定 (?admin=true)
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';

  // 📝 管理画面用のフォーム入力データ
  const [adminPoints, setAdminPoints] = useState({}); // { teamId: point }
  const [adminRanks, setAdminRanks] = useState({});   // { teamId: rank }
  const [saveLoading, setSaveLoading] = useState(false);

  // 🔄 データベースからデータを取得する関数
  const fetchStats = async (seasonId, stage) => {
    setLoading(true);
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8788' : '';
      const params = new URLSearchParams();
      if (seasonId) params.append('season_id', seasonId);
      if (stage) params.append('stage', stage);

      const res = await fetch(`${baseUrl}/api/data?${params.toString()}`);
      const data = await res.json();

      if (data.seasons) setSeasons(data.seasons);
      if (data.currentSeasonId) setCurrentSeasonId(data.currentSeasonId);
      if (data.currentStage) setCurrentStage(data.currentStage);
      
      if (data.teamStats) {
        setTeamStats(data.teamStats);
        
        // 管理画面用に、取得した既存データをフォームの初期値としてセット
        const initialPoints = {};
        const initialRanks = {};
        data.teamStats.forEach(team => {
          initialPoints[team.team_id] = team.total_point;
          initialRanks[team.team_id] = team.rank;
        });
        setAdminPoints(initialPoints);
        setAdminRanks(initialRanks);
      }
    } catch (err) {
      console.error("データ取得失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats('', 'レギュラー');
  }, []);

  // 📅 シーズン切り替え
  const handleSeasonChange = (id) => {
    setCurrentSeasonId(id);
    fetchStats(id, currentStage);
  };

  // 🏆 ステージ切り替え
  const handleStageChange = (stage) => {
    setCurrentStage(stage);
    fetchStats(currentSeasonId, stage);
  };

  // 💾 データを保存（追加・更新）する処理
  const handleSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8788' : '';
      
      // 送信用にデータを整形
      const payload = {
        season_id: Number(currentSeasonId),
        stage: currentStage,
        stats: Object.keys(adminPoints).map(teamId => ({
          team_id: Number(teamId),
          total_point: Number(adminPoints[teamId] || 0),
          rank: Number(adminRanks[teamId] || 9)
        }))
      };

      const res = await fetch(`${baseUrl}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('成績データを保存しました！');
        fetchStats(currentSeasonId, currentStage); // 最新データに再更新
      } else {
        const errData = await res.json();
        alert(`保存失敗: ${errData.error}`);
      }
    } catch (err) {
      alert(`通信エラー: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // ==========================================
  // 🔐 管理者画面のレンダリング
  // ==========================================
  if (isAdmin) {
    return (
      <div className="m-container">
        <header className="m-header">
          <h1>🛠️ M-LEAGUE ADMIN</h1>
          <p className="subtitle">【管理者用】成績登録・編集</p>
        </header>

        {/* 選択中のターゲット */}
        <div className="admin-status-box">
          現在選択中 ➔ <strong>
            {seasons.find(s => s.id === Number(currentSeasonId))?.name || '---'} 
            （{currentStage}）
          </strong>
        </div>

        {/* 条件切り替えパネル */}
        <div className="admin-selector-panel">
          <label>シーズン: </label>
          <select value={currentSeasonId} onChange={(e) => handleSeasonChange(e.target.value)}>
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <label style={{ marginLeft: '16px' }}>ステージ: </label>
          <select value={currentStage} onChange={(e) => handleStageChange(e.target.value)}>
            {['レギュラー', 'セミファイナル', 'ファイナル'].map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>

        {/* 成績入力フォーム */}
        <form onSubmit={handleSave} className="main-content">
          <div className="table-responsive">
            <table className="stats-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>順位 (1〜9)</th>
                  <th>チーム名</th>
                  <th style={{ width: '180px', textAlign: 'right' }}>トータルポイント (pt)</th>
                </tr>
              </thead>
              <tbody>
                {/* チーム成績が存在しない初期状態は全チーム一斉に入力欄を出すための裏技 */}
                {(teamStats.length > 0 ? teamStats : [
                  {team_id:1, team_name:'赤坂ドリブンズ'}, {team_id:2, team_name:'EX風林火山'},
                  {team_id:3, team_name:'KADOKAWAサクラナイツ'}, {team_id:4, team_name:'KONAMI麻雀格闘倶楽部'},
                  {team_id:5, team_name:'渋谷ABEMAS'}, {team_id:6, team_name:'セガサミーフェニックス'},
                  {team_id:7, team_name:'TEAM RAIDEN/雷電'}, {team_id:8, team_name:'BEAST X'}, {team_id:9, team_name:'U-NEXT Pirates'}
                ]).map((team) => (
                  <tr key={team.team_id}>
                    <td>
                      <input 
                        type="number" 
                        min="1" max="9"
                        required
                        className="admin-input rank-input"
                        value={adminRanks[team.team_id] || ''}
                        onChange={(e) => setAdminRanks({...adminRanks, [team.team_id]: e.target.value})}
                        placeholder="順位"
                      />
                    </td>
                    <td className="team-full-name">{team.team_name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <input 
                        type="number" 
                        step="0.1" 
                        required
                        className="admin-input point-input"
                        value={adminPoints[team.team_id] ?? ''}
                        onChange={(e) => setAdminPoints({...adminPoints, [team.team_id]: e.target.value})}
                        placeholder="0.0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="submit" className="admin-save-btn" disabled={saveLoading}>
            {saveLoading ? '保存中...' : '📊 この内容でデータベースを更新'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <a href="?" className="back-link">➔ 一般公開画面へ戻る</a>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // 📊 一般公開画面のレンダリング
  // ==========================================
  return (
    <div className="m-container">
      <header className="m-header">
        <h1>📊 M-LEAGUE STATS</h1>
        <p className="subtitle">Mリーグ 過去成績アーカイブ</p>
      </header>

      <div className="tab-container">
        {seasons.map((s) => (
          <button
            key={s.id}
            className={`tab-btn ${Number(currentSeasonId) === s.id ? 'active' : ''}`}
            onClick={() => handleSeasonChange(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="stage-container">
        {['レギュラー', 'セミファイナル', 'ファイナル'].map((stage) => (
          <button
            key={stage}
            className={`stage-btn ${currentStage === stage ? 'active' : ''}`}
            onClick={() => handleStageChange(stage)}
          >
            {stage}
          </button>
        ))}
      </div>

      <main className="main-content">
        {loading ? (
          <div className="loading-spinner">データを読み込み中...</div>
        ) : teamStats.length === 0 ? (
          <div className="no-data">
            指定されたシーズン・ステージの成績データがまだ登録されていません。<br />
            URLの末尾に <strong>?admin=true</strong> をつけると、管理画面からデータを登録できます。
          </div>
        ) : (
          <div className="table-responsive">
            <table className="stats-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>順位</th>
                  <th>チーム</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>ポイント</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>公式X</th>
                </tr>
              </thead>
              <tbody>
                {teamStats.map((team) => (
                  <tr key={team.stats_id} className={`rank-row r-${team.rank}`}>
                    <td className="rank-cell">
                      <span className="rank-badge">{team.rank}</span>
                    </td>
                    <td className="team-cell">
                      {team.logo_url && (
                        <img src={team.logo_url} alt={team.short_name} className="team-logo" />
                      )}
                      <div className="team-info">
                        <span className="team-full-name">{team.team_name}</span>
                        <span className="team-meta">{team.joined_year}年参入</span>
                      </div>
                    </td>
                    <td className="point-cell">
                      <span className={`point-val ${team.total_point >= 0 ? 'plus' : 'minus'}`}>
                        {team.total_point > 0 ? `+${team.total_point}` : team.total_point} pt
                      </span>
                    </td>
                    <td className="x-cell">
                      {team.x_username ? (
                        <a href={`https://x.com/${team.x_username}`} target="_blank" rel="noopener noreferrer" className="x-link">🐦</a>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
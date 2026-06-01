/**
 * Bilibili 每日自动任务
 * - 直播签到（领银瓜子）
 * - 银瓜子领取
 * - 观看视频（模拟心跳刷播放量）
 * - 分享视频
 * - 投币（可选）
 * - 漫画签到（可选）
 */

const axios = require('axios');

// ============================================================
// 配置
// ============================================================

// 从环境变量读取 Cookie
const SESSDATA = process.env.SESSDATA || '';
const BILI_JCT = process.env.BILI_JCT || '';
const DEDEUSERID = process.env.DEDEUSERID || '';
const DEDENAME = process.env.DEDENAME || '';

// 推送通知（Server酱/PushPlus等，可选）
const PUSH_KEY = process.env.PUSH_KEY || '';
const PUSH_TYPE = process.env.PUSH_TYPE || ''; // serverchan / pushplus / telegram

// 投币数量（0-5，默认0不投币）
const COIN_NUM = parseInt(process.env.COIN_NUM || '0');

// 观看视频数量
const WATCH_NUM = parseInt(process.env.WATCH_NUM || '5');

// 优先观看的视频 BV号列表（为空则随机推荐视频）
const WATCH_LIST = (process.env.WATCH_LIST || '').split(',').filter(Boolean);

// ============================================================
// 通用请求配置
// ============================================================

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.bilibili.com',
  'Cookie': `SESSDATA=${SESSDATA}; bili_jct=${BILI_JCT}; DedeUserID=${DEDEUSERID}; DedeUserName=${DEDENAME}`,
};

const api = axios.create({
  timeout: 15000,
  headers: HEADERS,
});

// 日志收集
const logs = [];

function log(msg) {
  const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const line = `[${time}] ${msg}`;
  console.log(line);
  logs.push(line);
}

// ============================================================
// 任务函数
// ============================================================

/**
 * 直播签到
 */
async function liveSign() {
  try {
    const res = await api.post('https://api.live.bilibili.com/sign/doSign');
    const data = res.data;
    if (data.code === 0) {
      log(`✅ 直播签到成功: ${data.data.text || JSON.stringify(data.data)}`);
    } else if (data.code === 1011040) {
      log(`⏭️ 直播签到: 今日已签到`);
    } else {
      log(`❌ 直播签到失败: [${data.code}] ${data.message}`);
    }
  } catch (e) {
    log(`❌ 直播签到异常: ${e.message}`);
  }
}

/**
 * 领取银瓜子
 */
async function freeSilver() {
  try {
    // 获取当前任务
    const taskRes = await api.get('https://api.live.bilibili.com/mobile/freeSilverCurrentTask');
    const taskData = taskRes.data;

    if (taskData.code === 0) {
      const timeEnd = taskData.data.time_end;
      const now = Math.floor(Date.now() / 1000);

      if (now >= timeEnd) {
        // 可以领取
        const awardRes = await api.post('https://api.live.bilibili.com/mobile/freeSilverAward');
        if (awardRes.data.code === 0) {
          log(`✅ 领取银瓜子成功: +${awardRes.data.data.awardSilver}个`);
        } else {
          log(`❌ 领取银瓜子失败: [${awardRes.data.code}] ${awardRes.data.message}`);
        }
      } else {
        const waitSec = timeEnd - now;
        log(`⏳ 银瓜子还需等待 ${waitSec} 秒，跳过自动等待`);
      }
    } else if (taskData.code === -800) {
      log(`⏭️ 银瓜子: 今日已领取`);
    } else {
      log(`❌ 银瓜子任务查询失败: [${taskData.code}] ${taskData.message}`);
    }
  } catch (e) {
    log(`❌ 银瓜子异常: ${e.message}`);
  }
}

/**
 * 获取视频信息
 */
async function getVideoInfo(bvid) {
  try {
    const res = await api.get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
    if (res.data.code === 0) {
      return res.data.data;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * 获取推荐视频列表
 */
async function getRecommendVideos() {
  try {
    const res = await api.get('https://api.bilibili.com/x/web-interface/popular?ps=20&pn=1');
    if (res.data.code === 0) {
      return res.data.data.list.map(item => item.bvid);
    }
  } catch (e) {}

  // 备用：获取热门视频
  try {
    const res = await api.get('https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all');
    if (res.data.code === 0) {
      return res.data.data.list.slice(0, 20).map(item => item.bvid);
    }
  } catch (e) {}

  return [];
}

/**
 * 观看视频（发送心跳模拟播放）
 */
async function watchVideo(bvid) {
  try {
    const video = await getVideoInfo(bvid);
    if (!video) {
      log(`❌ 获取视频信息失败: ${bvid}`);
      return false;
    }

    const aid = video.aid;
    const cid = video.cid;
    const duration = video.duration; // 秒
    const title = video.title;

    log(`📺 观看视频: ${title} (${bvid}, 时长${duration}秒)`);

    // 模拟观看，发送多次心跳
    const watchDuration = Math.min(duration, 300); // 最多模拟看300秒
    const steps = Math.ceil(watchDuration / 30);

    for (let i = 0; i < steps; i++) {
      const playedTime = Math.min((i + 1) * 30, watchDuration);

      await api.post('https://api.bilibili.com/x/report/web/heartbeat', new URLSearchParams({
        aid: String(aid),
        cid: String(cid),
        played_time: String(playedTime),
        realtime: String(playedTime),
        start_ts: String(Math.floor(Date.now() / 1000) - playedTime),
        type: '3',
        dt: '2',
        play_type: i === 0 ? '1' : '0', // 1=开始, 0=继续
      }).toString(), {
        headers: {
          ...HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // 等待2-5秒
      await sleep(randomInt(2000, 5000));
    }

    log(`✅ 观看完成: ${title}`);
    return true;
  } catch (e) {
    log(`❌ 观看视频异常: ${e.message}`);
    return false;
  }
}

/**
 * 批量观看视频
 */
async function watchVideos() {
  let bvids = [];

  // 优先使用指定视频列表
  if (WATCH_LIST.length > 0) {
    bvids = WATCH_LIST.slice(0, WATCH_NUM);
    // 如果指定视频不够，补充推荐视频
    if (bvids.length < WATCH_NUM) {
      const recommends = await getRecommendVideos();
      bvids = bvids.concat(recommends.slice(0, WATCH_NUM - bvids.length));
    }
  } else {
    // 随机推荐视频
    const recommends = await getRecommendVideos();
    bvids = recommends.slice(0, WATCH_NUM);
  }

  if (bvids.length === 0) {
    log('❌ 未获取到可观看的视频');
    return;
  }

  log(`📋 计划观看 ${bvids.length} 个视频`);

  let watched = 0;
  for (const bvid of bvids) {
    const ok = await watchVideo(bvid);
    if (ok) watched++;
    await sleep(randomInt(3000, 8000));
  }

  log(`📊 观看统计: 成功 ${watched}/${bvids.length}`);
}

/**
 * 分享视频
 */
async function shareVideo(bvid) {
  try {
    const video = await getVideoInfo(bvid || 'BV1uT4y1P7CX');
    if (!video) {
      log('❌ 分享视频: 获取视频信息失败');
      return;
    }

    const res = await api.post('https://api.bilibili.com/x/web-interface/share/add', new URLSearchParams({
      aid: String(video.aid),
      bvid: video.bvid,
      eab_x: '1',
      ramval: '0',
      source: 'pc_normal',
      ga: '1',
    }).toString(), {
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (res.data.code === 0) {
      log(`✅ 分享视频成功: ${video.title}`);
    } else {
      log(`❌ 分享视频失败: [${res.data.code}] ${res.data.message}`);
    }
  } catch (e) {
    log(`❌ 分享视频异常: ${e.message}`);
  }
}

/**
 * 投币
 */
async function coinAdd() {
  if (COIN_NUM <= 0) {
    log('⏭️ 投币: 未启用 (COIN_NUM=0)');
    return;
  }

  try {
    // 获取推荐视频作为投币目标
    const recommends = await getRecommendVideos();
    let coinCount = 0;

    for (const bvid of recommends) {
      if (coinCount >= COIN_NUM) break;

      const video = await getVideoInfo(bvid);
      if (!video) continue;

      const res = await api.post('https://api.bilibili.com/x/web-interface/coin/add', new URLSearchParams({
        aid: String(video.aid),
        multiply: '1',
        select_like: '1',
      }).toString(), {
        headers: {
          ...HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (res.data.code === 0) {
        coinCount++;
        log(`✅ 投币成功: ${video.title}`);
      } else {
        log(`❌ 投币失败: [${res.data.code}] ${res.data.message}`);
      }

      await sleep(randomInt(2000, 5000));
    }

    log(`📊 投币统计: 成功 ${coinCount}/${COIN_NUM}`);
  } catch (e) {
    log(`❌ 投币异常: ${e.message}`);
  }
}

/**
 * 漫画签到
 */
async function mangaSign() {
  try {
    const res = await api.post('https://manga.bilibili.com/twirp/sign.v1.Sign/SignIn', JSON.stringify({}), {
      headers: {
        ...HEADERS,
        'Content-Type': 'application/json',
      },
    });

    if (res.data.code === 0) {
      log(`✅ 漫画签到成功`);
    } else {
      log(`❌ 漫画签到失败: [${res.data.code}] ${res.data.msg || res.data.message}`);
    }
  } catch (e) {
    log(`❌ 漫画签到异常: ${e.message}`);
  }
}

/**
 * 查询用户信息
 */
async function getUserInfo() {
  try {
    const res = await api.get('https://api.bilibili.com/x/web-interface/nav');
    if (res.data.code === 0) {
      const info = res.data.data;
      log(`👤 用户: ${info.uname} | 硬币: ${info.money} | 等级: ${info.level_info.current_level} | VIP: ${info.vipStatus ? '是' : '否'}`);
      return info;
    }
  } catch (e) {
    log(`❌ 获取用户信息异常: ${e.message}`);
  }
  return null;
}

// ============================================================
// 推送通知
// ============================================================

async function notify(title, content) {
  if (!PUSH_KEY) return;

  try {
    if (PUSH_TYPE === 'serverchan') {
      await axios.post(`https://sctapi.ftqq.com/${PUSH_KEY}.send`, {
        title,
        desp: content,
      });
    } else if (PUSH_TYPE === 'pushplus') {
      await axios.post('http://www.pushplus.plus/send', {
        token: PUSH_KEY,
        title,
        content,
        template: 'html',
      });
    } else if (PUSH_TYPE === 'telegram') {
      const [botToken, chatId] = PUSH_KEY.split('|');
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: `<b>${title}</b>\n\n${content}`,
        parse_mode: 'HTML',
      });
    }
    log('📨 通知推送成功');
  } catch (e) {
    log(`❌ 通知推送失败: ${e.message}`);
  }
}

// ============================================================
// 工具函数
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  log('🚀 Bilibili 每日任务开始');
  log('━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!SESSDATA) {
    log('❌ 未配置 SESSDATA，请设置 GitHub Secrets');
    process.exit(1);
  }

  // 查询用户信息
  await getUserInfo();

  log('');
  log('📋 === 直播签到 ===');
  await liveSign();

  log('');
  log('📋 === 银瓜子 ===');
  await freeSilver();

  log('');
  log('📋 === 漫画签到 ===');
  await mangaSign();

  log('');
  log('📋 === 观看视频 ===');
  await watchVideos();

  log('');
  log('📋 === 分享视频 ===');
  const shareBvid = WATCH_LIST.length > 0 ? WATCH_LIST[0] : null;
  await shareVideo(shareBvid);

  log('');
  log('📋 === 投币 ===');
  await coinAdd();

  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━');
  log('🏁 Bilibili 每日任务完成');

  // 查询最终用户信息
  await getUserInfo();

  // 推送通知
  await notify('Bilibili 每日任务报告', logs.join('\n'));
}

main().catch(err => {
  log(`❌ 主流程异常: ${err.message}`);
  process.exit(1);
});

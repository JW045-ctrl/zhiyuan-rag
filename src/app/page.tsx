import type { Metadata } from "next";
import Link from "next/link";

import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "悦享会员2.0项目门户｜知源",
  description:
    "悦享咖啡会员小程序2.0升级项目的背景、范围、进度与项目知识助手入口。",
};

const projectFacts = [
  { label: "甲方客户", value: "悦享咖啡连锁有限公司" },
  { label: "项目承接", value: "星河数字科技有限公司" },
  { label: "当前阶段", value: "内部测试、缺陷修复与客户验收准备" },
  { label: "计划上线", value: "2032年10月20日", meta: "计划中" },
];

const projectGoals = [
  "改善会员登录、积分、优惠券与下单体验",
  "统一规则，减少客服与门店解释成本",
  "在秋季会员节前完成上线并留出稳定观察时间",
];

const scopeModules = [
  { title: "会员登录与账户", detail: "微信授权、手机号绑定与账户关联" },
  { title: "会员等级与积分", detail: "等级进度、积分余额与变动记录" },
  { title: "优惠券中心", detail: "领取、状态、使用门槛与叠加规则" },
  { title: "门店查询", detail: "地址、营业时间与临时营业状态" },
  { title: "到店自取", detail: "选店、选品、优惠结算与微信支付" },
  { title: "订单与售后", detail: "订单状态、取消申请与退款进度" },
];

const timeline = [
  { date: "2032年8月17日", title: "项目启动", state: "completed", label: "已发生" },
  { date: "2032年8月28日", title: "需求基线冻结", state: "completed", label: "已完成" },
  { date: "2032年9月11日", title: "交互原型确认", state: "completed", label: "已完成" },
  { date: "2032年9月30日", title: "完整功能演示", state: "completed", label: "已完成" },
  { date: "2032年10月5日", title: "当前知识时点", state: "current", label: "资料更新至此" },
  { date: "2032年10月12日", title: "客户验收版本", state: "planned", label: "计划中" },
  { date: "2032年10月20日", title: "正式生产上线", state: "planned", label: "计划中" },
];

const exampleQuestions = [
  "客户最重视哪些要求？",
  "外卖配送为什么移出本期？",
  "优惠券最终规则发生了什么变化？",
  "哪些风险可能影响客户验收？",
  "客户验收版本计划什么时候提交？",
];

export default function HomePage() {
  return (
    <div className={styles.pageShell}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link className={styles.brand} href="/" aria-label="知源项目门户首页">
            <span className={styles.brandMark} aria-hidden="true">
              知
            </span>
            <span>知源</span>
          </Link>
          <nav className={styles.topbarNav} aria-label="主要导航">
            <span aria-current="page">项目门户</span>
            <Link href="/assistant">项目知识助手</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="project-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>悦享咖啡会员小程序 2.0 升级项目</p>
            <h1 id="project-title">悦享会员 2.0</h1>
            <p className={styles.lead}>
              星河数字科技为悦享咖啡提供的会员小程序升级与交付项目，围绕会员账户、积分、优惠券、门店、到店自取和订单售后进行升级。
            </p>
            <p className={styles.knowledgeDate}>当前项目资料更新至2032年10月5日。</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href="/assistant">
                进入项目知识助手
                <span aria-hidden="true">→</span>
              </Link>
              <Link className={styles.secondaryAction} href="#project-background">
                了解项目背景
              </Link>
            </div>
          </div>

          <dl className={styles.factGrid} aria-label="项目概览">
            {projectFacts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
                {fact.meta ? <span>{fact.meta}</span> : null}
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.backgroundSection} id="project-background">
          <div className={styles.sectionHeading}>
            <p>项目背景</p>
            <h2>为什么启动这个项目？</h2>
          </div>
          <div className={styles.backgroundContent}>
            <p>
              悦享咖啡原会员小程序已经运行约两年，逐渐出现手机号登录偶尔失败、积分到账延迟、优惠券规则理解不一致、门店信息更新不及时，以及活动期间访问速度下降等问题。
            </p>
            <p>
              悦享咖啡计划于2032年11月1日开始秋季会员节，因此希望在活动前完成会员小程序2.0升级，并在正式上线后留出稳定观察时间。
            </p>
            <ul className={styles.goalList} aria-label="项目总体目标">
              {projectGoals.map((goal, index) => (
                <li key={goal}>
                  <span aria-hidden="true">0{index + 1}</span>
                  {goal}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.scopeSection} aria-labelledby="scope-title">
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionHeading}>
              <p>交付范围</p>
              <h2 id="scope-title">本期主要范围</h2>
            </div>
            <p className={styles.sectionSummary}>
              聚焦会员从登录、权益查看到下单和售后的核心路径。
            </p>
          </div>
          <ul className={styles.scopeGrid}>
            {scopeModules.map((module, index) => (
              <li key={module.title}>
                <span className={styles.scopeIndex} aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3>{module.title}</h3>
                  <p>{module.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className={styles.scopeBoundary}>
            本期聚焦会员核心体验，不包含外卖配送、礼品卡、企业团购、独立App及其他已明确排除的功能。
          </p>
        </section>

        <section className={styles.timelineSection} aria-labelledby="timeline-title">
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionHeading}>
              <p>关键节点</p>
              <h2 id="timeline-title">项目进度</h2>
            </div>
            <div className={styles.timelineLegend} aria-label="进度状态说明">
              <span><i className={styles.completedDot} />已完成</span>
              <span><i className={styles.currentDot} />当前时点</span>
              <span><i className={styles.plannedDot} />计划事项</span>
            </div>
          </div>
          <ol className={styles.timeline}>
            {timeline.map((item) => (
              <li className={styles[item.state]} key={`${item.date}-${item.title}`}>
                <span className={styles.timelineMarker} aria-hidden="true" />
                <time>{item.date}</time>
                <strong>{item.title}</strong>
                <span className={styles.timelineState}>{item.label}</span>
              </li>
            ))}
          </ol>
          <p className={styles.timelineNote}>
            秋季会员节计划于2032年11月1日开始；截至当前知识时点，客户验收版本、正式上线和会员节均尚未发生。
          </p>
        </section>

        <section className={styles.assistantSection} aria-labelledby="assistant-overview-title">
          <div className={styles.assistantIntro}>
            <p className={styles.kicker}>项目知识助手</p>
            <h2 id="assistant-overview-title">快速了解项目</h2>
            <p>
              项目资料覆盖需求、里程碑、会议纪要、需求变更、风险和验收标准。你可以直接询问当前状态、历史决策和项目边界。
            </p>
            <Link className={styles.primaryAction} href="/assistant">
              进入项目知识助手
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className={styles.questionList} aria-label="可以询问的示例问题">
            {exampleQuestions.map((question) => (
              <li key={question}>
                <Link
                  href={{
                    pathname: "/assistant",
                    query: { question },
                  }}
                >
                  <span>{question}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          本项目中的公司、业务、日期和事件均为虚构演示内容，仅用于RAG项目开发、评估与公开展示。
        </p>
      </footer>
    </div>
  );
}

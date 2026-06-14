/* global window, localStorage, JSON */
(function (global) {
  const STORAGE_KEY = 'repair_quote_workbench_v1';

  const USERS = {
    service:   { id: 'service',   name: '王小美', role: 'service',   title: '客服主管' },
    tech:      { id: 'tech',      name: '李师傅', role: 'tech',      title: '高级维修技师' },
    tech2:     { id: 'tech2',     name: '张师傅', role: 'tech',      title: '资深水电技师' },
    client:    { id: 'client',    name: '陈女士', role: 'client',    title: '业主', phone: '138****6688', address: '朝阳区望京SOHO T1-1803' },
    client2:   { id: 'client2',   name: '刘先生', role: 'client',    title: '业主', phone: '139****2233', address: '海淀区中关村软件园 8号楼' },
    reviewer:  { id: 'reviewer',  name: '赵会计', role: 'reviewer',  title: '财务复核' }
  };

  const MATERIAL_CATALOG = [
    { code: 'M001', name: 'PPR热水管 φ25',     unit: '米',   price: 28.5,  stock: 120, category: '水电' },
    { code: 'M002', name: 'PPR弯头 φ25',       unit: '个',   price: 4.5,   stock: 300, category: '水电' },
    { code: 'M003', name: '国标铜线 BV-4mm²',  unit: '米',   price: 12.8,  stock: 500, category: '水电' },
    { code: 'M004', name: '86型暗盒',          unit: '个',   price: 3.2,   stock: 200, category: '水电' },
    { code: 'M005', name: '漏电保护器 32A',    unit: '只',   price: 68.0,  stock: 45,  category: '水电' },
    { code: 'M006', name: '生料带',            unit: '卷',   price: 5.0,   stock: 80,  category: '水电' },
    { code: 'M007', name: '水龙头（铜芯）',    unit: '只',   price: 185.0, stock: 22,  category: '水暖' },
    { code: 'M008', name: '角阀',              unit: '只',   price: 35.0,  stock: 60,  category: '水暖' },
    { code: 'M009', name: '高压软管 50cm',     unit: '根',   price: 22.0,  stock: 100, category: '水暖' },
    { code: 'M010', name: '玻璃胶（防霉）',    unit: '支',   price: 32.0,  stock: 40,  category: '辅材' },
    { code: 'M011', name: '膨胀螺栓 M10',      unit: '套',   price: 2.8,   stock: 150, category: '辅材' },
    { code: 'M012', name: '防臭地漏',          unit: '只',   price: 78.0,  stock: 18,  category: '水暖' },
    { code: 'M013', name: '防水涂料（柔性）',  unit: '桶',   price: 260.0, stock: 12,  category: '防水' },
    { code: 'M014', name: '空调支架 1.5P',     unit: '副',   price: 55.0,  stock: 35,  category: '空调' },
    { code: 'M015', name: '氟利昂 R22',        unit: '公斤', price: 95.0,  stock: 50,  category: '空调' },
    { code: 'M016', name: '热水器镁棒',        unit: '根',   price: 45.0,  stock: 25,  category: '家电' },
    { code: 'M017', name: '洗衣机进水管',      unit: '根',   price: 18.0,  stock: 40,  category: '家电' },
    { code: 'M018', name: '烟道止逆阀',        unit: '只',   price: 65.0,  stock: 15,  category: '家电' },
    { code: 'M019', name: '下水道疏通剂',      unit: '瓶',   price: 28.0,  stock: 30,  category: '疏通' },
    { code: 'M020', name: '密封胶带（加强型）',unit: '卷',   price: 12.0,  stock: 55,  category: '辅材' }
  ];

  function buildSeedOrders() {
    const now = Date.now();
    const h = 3600 * 1000;
    return [
      {
        id: 'Q20260614-001',
        createdAt: now - 28 * h,
        clientId: 'client',
        category: '水暖维修',
        title: '卫生间漏水 + 淋浴龙头更换',
        description: '卫生间地砖缝隙渗水到楼下，淋浴龙头关不严滴水。希望师傅尽快上门。',
        customerBudget: 1500,
        estimateUpper: 2000,
        serviceUserId: 'service',
        techUserId: 'tech',
        status: 'working',
        priceLocked: true,
        survey: {
          visitedAt: now - 22 * h,
          photos: [],
          diagnosis: '1. 防水层老化导致地砖缝渗水；2. 淋浴龙头陶瓷阀芯磨损。建议重做局部防水并更换龙头。',
          areaSize: '约 4㎡ 地面 + 墙面返高 30cm',
          difficulty: '中等'
        },
        materials: [
          { code: 'M013', name: '防水涂料（柔性）', unit: '桶', price: 260, qty: 2 },
          { code: 'M007', name: '水龙头（铜芯）',   unit: '只', price: 185, qty: 1 },
          { code: 'M008', name: '角阀',             unit: '只', price: 35,  qty: 2 },
          { code: 'M009', name: '高压软管 50cm',    unit: '根', price: 22,  qty: 2 },
          { code: 'M010', name: '玻璃胶（防霉）',   unit: '支', price: 32,  qty: 2 }
        ],
        labor: [
          { item: '防水基层清理与涂刷',    unit: '项', price: 450, qty: 1 },
          { item: '淋浴龙头及附件安装',    unit: '项', price: 180, qty: 1 },
          { item: '48 小时闭水测试',       unit: '次', price: 100, qty: 1 }
        ],
        visitFee: 80,
        addItems: [],
        warranty: { months: 12, scope: '防水涂层、龙头安装工艺，非人为损坏' },
        pricing: {
          materials: 794,
          labor: 730,
          visit: 80,
          subtotal: 1604,
          discount: 0,
          total: 1604
        },
        timeline: [
          { type: 'status', sub: 'created', title: '客服创建需求', time: now - 28 * h, userId: 'service',
            content: '记录客户报修：卫生间渗水 + 龙头滴水，已告知客户大致心理价位约 1500 元，预估上限设为 2000 元。' },
          { type: 'status', sub: 'assigned', title: '派单', time: now - 27 * h, userId: 'service',
            content: '已指派李师傅上门勘查。', meta: [{ k: '派给', v: '李师傅' }] },
          { type: 'status', sub: 'survey', title: '师傅上门勘查', time: now - 22 * h, userId: 'tech',
            content: '已现场勘查并确认施工方案。' },
          { type: 'status', sub: 'priced', title: '报价单生成', time: now - 21 * h, userId: 'tech',
            content: '材料 794 + 工时 730 + 上门费 80 = 1604 元，未超过预估上限，无需复核。' },
          { type: 'status', sub: 'pending', title: '客户待确认', time: now - 21 * h, userId: 'tech',
            content: '报价已提交客户确认。' },
          { type: 'status', sub: 'confirmed', title: '客户确认报价', time: now - 19 * h, userId: 'client',
            content: '已阅读并同意报价明细，承诺在施工前支付 30% 订金。' },
          { type: 'finance', sub: 'deposit', title: '收到订金', time: now - 18 * h, userId: 'reviewer',
            content: '客户支付 500 元订金（报价 31%）。', meta: [{ k: '金额', v: '¥500.00' }] },
          { type: 'status', sub: 'working', title: '开工', time: now - 16 * h, userId: 'tech',
            content: '已按方案开始施工，原始报价已锁价，后续任何价格调整必须走变更单流程。' }
        ],
        changeOrders: [],
        invoices: [],
        deposit: 500,
        reworkCount: 0
      },
      {
        id: 'Q20260614-002',
        createdAt: now - 12 * h,
        clientId: 'client2',
        category: '电路维修',
        title: '厨房插座全部无电 + 更换漏电保护器',
        description: '昨天跳闸后厨房插座全部没电，试过复位不成功，怀疑漏保坏了。',
        customerBudget: 500,
        estimateUpper: 800,
        serviceUserId: 'service',
        techUserId: null,
        status: 'draft',
        priceLocked: false,
        survey: null,
        materials: [],
        labor: [],
        visitFee: 0,
        addItems: [],
        warranty: { months: 0, scope: '' },
        pricing: { materials: 0, labor: 0, visit: 0, subtotal: 0, discount: 0, total: 0 },
        timeline: [
          { type: 'status', sub: 'created', title: '客服创建需求', time: now - 12 * h, userId: 'service',
            content: '刘先生报修厨房插座全无电，客户预算约 500，预估上限 800。正在派单中。' }
        ],
        changeOrders: [],
        invoices: [],
        deposit: 0,
        reworkCount: 0
      },
      {
        id: 'Q20260614-003',
        createdAt: now - 50 * h,
        clientId: 'client',
        category: '家电维修',
        title: '1.5匹挂机空调不制冷 + 清洗',
        description: '打开只出风不冷，3 年没洗过，一起做一下深度清洗。',
        customerBudget: 600,
        estimateUpper: 900,
        serviceUserId: 'service',
        techUserId: 'tech2',
        status: 'review',
        priceLocked: false,
        survey: {
          visitedAt: now - 44 * h,
          photos: [],
          diagnosis: '实测压力 3.5kgf/cm²，低于正常值（5±0.5），缺氟约 1kg。散热器翅片灰尘严重。',
          areaSize: '1.5匹挂机',
          difficulty: '简单'
        },
        materials: [
          { code: 'M015', name: '氟利昂 R22',      unit: '公斤', price: 95,  qty: 1 },
          { code: 'M014', name: '空调支架 1.5P',   unit: '副',   price: 55,  qty: 1 }
        ],
        labor: [
          { item: '深度拆机清洗',   unit: '台', price: 260, qty: 1 },
          { item: '加氟利昂',       unit: '次', price: 120, qty: 1 },
          { item: '支架更换',       unit: '次', price: 80,  qty: 1 }
        ],
        visitFee: 60,
        addItems: [],
        warranty: { months: 6, scope: '氟利昂压力、清洗后效果（非再次积尘）' },
        pricing: {
          materials: 150,
          labor: 460,
          visit: 60,
          subtotal: 670,
          discount: 0,
          total: 1280
        },
        overEstimateReason: '客户要求一并更换已锈蚀支架并追加深度清洗服务，超出原预估上限 ¥380。',
        reviewStatus: 'pending',
        timeline: [
          { type: 'status', sub: 'created', title: '客服创建需求', time: now - 50 * h, userId: 'service',
            content: '陈女士二次报修：空调不制冷+清洗，原预估上限 900 元。' },
          { type: 'status', sub: 'assigned', title: '派单', time: now - 48 * h, userId: 'service',
            content: '指派张师傅（资深家电技师）上门勘查。', meta: [{ k: '派给', v: '张师傅' }] },
          { type: 'status', sub: 'survey', title: '师傅上门勘查', time: now - 44 * h, userId: 'tech2',
            content: '现场检测：缺氟、支架锈蚀严重。客户额外要求深度清洗。方案已与客户口头沟通。' },
          { type: 'status', sub: 'priced', title: '报价单生成（超预估）', time: now - 43 * h, userId: 'tech2',
            content: '报价 ¥1,280 超出预估上限 ¥900，已填写超预估原因，等待财务复核。' },
          { type: 'status', sub: 'review', title: '超预估复核中', time: now - 43 * h, userId: 'tech2',
            content: '系统已将超预估报价推送给财务复核。' }
        ],
        changeOrders: [],
        invoices: [],
        deposit: 0,
        reworkCount: 0
      },
      {
        id: 'Q20260614-004',
        createdAt: now - 96 * h,
        clientId: 'client2',
        category: '疏通/防水',
        title: '厨房下水道反复堵塞疏通',
        description: '近一周洗碗池下水很慢，用开水通了也没用。',
        customerBudget: 300,
        estimateUpper: 500,
        serviceUserId: 'service',
        techUserId: 'tech',
        status: 'done',
        priceLocked: true,
        survey: {
          visitedAt: now - 92 * h,
          photos: [],
          diagnosis: '主立管弯头处油脂结块+杂物堆积，已用高压水冲+弹簧疏通机清理干净。',
          areaSize: 'φ110 主立管约 2 米',
          difficulty: '中等'
        },
        materials: [
          { code: 'M019', name: '下水道疏通剂', unit: '瓶', price: 28, qty: 1 }
        ],
        labor: [
          { item: '高压水冲疏通',       unit: '次', price: 180, qty: 1 },
          { item: '弹簧疏通机清理',     unit: '次', price: 120, qty: 1 }
        ],
        visitFee: 60,
        addItems: [
          { name: '主管拆口检查', amount: 100, reason: '疏通中途发现主管堵塞严重，需拆口检查并复原。', approved: true }
        ],
        warranty: { months: 3, scope: '相同位置再次堵塞（非异物掉入）' },
        pricing: {
          materials: 28,
          labor: 300,
          visit: 60,
          addon: 100,
          subtotal: 488,
          discount: 0,
          total: 488
        },
        timeline: [
          { type: 'status', sub: 'created',   title: '客服创建需求', time: now - 96 * h, userId: 'service', content: '刘先生首次报修厨房下水问题。' },
          { type: 'status', sub: 'assigned',  title: '派单',          time: now - 95 * h, userId: 'service', content: '指派李师傅。' },
          { type: 'status', sub: 'survey',    title: '上门勘查',      time: now - 92 * h, userId: 'tech',    content: '现场检测确认主管油脂结块堵塞。' },
          { type: 'status', sub: 'priced',    title: '报价',          time: now - 92 * h, userId: 'tech',    content: '报价 ¥388，在预估内。' },
          { type: 'status', sub: 'confirmed', title: '客户确认',      time: now - 91 * h, userId: 'client2', content: '同意报价，立即施工。' },
          { type: 'status', sub: 'working',   title: '开工',          time: now - 90 * h, userId: 'tech',    content: '开始施工，报价锁价。' },
          { type: 'change', sub: 'addon',     title: '追加报价变更',  time: now - 88 * h, userId: 'tech',
            content: '施工中发现堵塞严重，需拆口检查，申请追加 ¥100。',
            meta: [{ k: '追加金额', v: '+¥100' }] },
          { type: 'change', sub: 'approved',  title: '变更单客户确认',time: now - 87 * h, userId: 'client2', content: '同意追加，总价调整为 ¥488。' },
          { type: 'status', sub: 'checking',  title: '完工待验收',    time: now - 84 * h, userId: 'tech',    content: '疏通完毕，放水测试顺畅。' },
          { type: 'status', sub: 'accepted',  title: '客户验收通过',  time: now - 82 * h, userId: 'client2', content: '验收通过，开具保修承诺。' },
          { type: 'finance', sub: 'deposit',  title: '尾款结清',      time: now - 82 * h, userId: 'reviewer',
            content: '客户支付尾款 ¥488。', meta: [{ k: '实付', v: '¥488' }] },
          { type: 'finance', sub: 'invoice',  title: '开具发票',      time: now - 80 * h, userId: 'reviewer',
            content: '电子普通发票已开具并发送至客户邮箱。', meta: [{ k: '发票号', v: 'FP20260612-0088' }, { k: '金额', v: '¥488.00' }] },
          { type: 'status', sub: 'done',      title: '工单完成归档',  time: now - 78 * h, userId: 'service', content: '保修 3 个月，工单圆满关闭。' }
        ],
        changeOrders: [
          {
            id: 'C001',
            createdAt: now - 88 * h,
            createdBy: 'tech',
            items: [{ name: '主管拆口检查与复原', amount: 100, reason: '施工中发现堵塞超出预期' }],
            totalAdd: 100,
            status: 'approved',
            approvedAt: now - 87 * h,
            approvedBy: 'client2'
          }
        ],
        invoices: [{ id: 'INV001', amount: 488, date: now - 80 * h, status: 'issued' }],
        deposit: 488,
        reworkCount: 0
      },
      {
        id: 'Q20260614-005',
        createdAt: now - 10 * h,
        clientId: 'client',
        category: '门窗维修',
        title: '阳台推拉门脱轨+异响',
        description: '阳台推拉门推不动，有明显金属摩擦异响。',
        customerBudget: 350,
        estimateUpper: 500,
        serviceUserId: 'service',
        techUserId: 'tech2',
        status: 'returned',
        priceLocked: false,
        survey: {
          visitedAt: now - 8 * h,
          photos: [],
          diagnosis: '下轨滑轮磨损严重（塑料碎裂），需更换 2 组铜芯滑轮，轨道轻度变形可校正。',
          areaSize: '2.4m × 2.2m 推拉门',
          difficulty: '简单'
        },
        materials: [],
        labor: [
          { item: '滑轮更换 2 组', unit: '项', price: 260, qty: 1 },
          { item: '轨道校正调平', unit: '项', price: 150, qty: 1 }
        ],
        visitFee: 60,
        addItems: [],
        warranty: { months: 6, scope: '滑轮脱轨、再次异响' },
        pricing: {
          materials: 0,
          labor: 410,
          visit: 60,
          subtotal: 470,
          discount: 0,
          total: 470
        },
        returnReason: '报价缺少滑轮材料费明细（虽然写在报价里但未列出品牌和规格），请补充完整后重报。',
        returnedAt: now - 5 * h,
        timeline: [
          { type: 'status', sub: 'created',  title: '客服创建需求', time: now - 10 * h, userId: 'service', content: '陈女士第三次报修：阳台推拉门脱轨。' },
          { type: 'status', sub: 'assigned', title: '派单',          time: now - 9 * h,  userId: 'service', content: '指派张师傅（擅长门窗）。' },
          { type: 'status', sub: 'survey',   title: '上门勘查',      time: now - 8 * h,  userId: 'tech2',   content: '滑轮+轨道问题，方案已确定。' },
          { type: 'status', sub: 'priced',   title: '报价生成',      time: now - 7 * h,  userId: 'tech2',   content: '报价 ¥470，已提交客户。' },
          { type: 'status', sub: 'pending',  title: '客户待确认',    time: now - 7 * h,  userId: 'tech2',   content: '' },
          { type: 'status', sub: 'returned', title: '客户退回报价',  time: now - 5 * h,  userId: 'client',
            content: '报价缺少关键材料的明细，请补充品牌规格后重新报价。',
            meta: [{ k: '退回原因', v: '缺少滑轮材料费明细（品牌、规格）' }] }
        ],
        changeOrders: [],
        invoices: [],
        deposit: 0,
        reworkCount: 0
      }
    ];
  }

  const DEFAULT_STATE = {
    orders: buildSeedOrders(),
    materials: MATERIAL_CATALOG.slice(),
    nextOrderSeq: 6,
    nextChangeSeq: 2,
    currentRoleId: 'service'
  };

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  const Store = {
    _cache: null,
    load() {
      if (this._cache) return this._cache;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try { this._cache = JSON.parse(raw); }
        catch (_) { this._cache = deepClone(DEFAULT_STATE); this.save(); }
      } else {
        this._cache = deepClone(DEFAULT_STATE); this.save();
      }
      return this._cache;
    },
    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._cache || DEFAULT_STATE));
    },
    reset() {
      this._cache = deepClone(DEFAULT_STATE);
      this.save();
    },
    users() { return USERS; },
    currentRole() {
      const s = this.load();
      return USERS[s.currentRoleId] || USERS.service;
    },
    setRole(id) {
      const s = this.load();
      if (USERS[id]) { s.currentRoleId = id; this.save(); }
    },
    orders(filterFn) {
      const s = this.load();
      const list = deepClone(s.orders);
      return filterFn ? list.filter(filterFn) : list;
    },
    getOrder(id) {
      const s = this.load();
      const o = s.orders.find(x => x.id === id);
      return o ? deepClone(o) : null;
    },
    saveOrder(order) {
      const s = this.load();
      const idx = s.orders.findIndex(x => x.id === order.id);
      if (idx >= 0) s.orders[idx] = deepClone(order);
      else s.orders.unshift(deepClone(order));
      this.save();
      return this.getOrder(order.id);
    },
    newOrderId() {
      const s = this.load();
      const n = s.nextOrderSeq++;
      const d = new Date();
      const pad = x => String(x).padStart(2, '0');
      const id = `Q${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${String(n).padStart(3,'0')}`;
      this.save();
      return id;
    },
    newChangeId() {
      const s = this.load();
      const n = s.nextChangeSeq++;
      this.save();
      return `C${String(n).padStart(3,'0')}`;
    },
    materials() { return deepClone(this.load().materials); }
  };

  const Util = {
    fmtMoney(n) {
      const v = Number(n || 0);
      return '¥' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    fmtTime(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      const p = x => String(x).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    },
    fmtDate(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      const p = x => String(x).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
    },
    relativeTime(ts) {
      const diff = Date.now() - ts;
      if (diff < 60*1000) return '刚刚';
      if (diff < 3600*1000) return Math.floor(diff/60000) + '分钟前';
      if (diff < 86400*1000) return Math.floor(diff/3600000) + '小时前';
      return Math.floor(diff/86400000) + '天前';
    },
    statusLabel(status) {
      const m = {
        draft:     { text: '待派单', cls: 'tag-draft' },
        assigned:  { text: '待勘查', cls: 'tag-estimate' },
        surveying: { text: '勘查中', cls: 'tag-estimate' },
        priced:    { text: '待复核', cls: 'tag-review' },
        review:    { text: '超预估复核', cls: 'tag-review' },
        pending:   { text: '客户待确认', cls: 'tag-pending' },
        returned:  { text: '已退回重报', cls: 'tag-return' },
        confirmed: { text: '已确认待开工', cls: 'tag-confirmed' },
        working:   { text: '施工中', cls: 'tag-working' },
        change:    { text: '变更中', cls: 'tag-change' },
        checking:  { text: '待验收', cls: 'tag-check' },
        rework:    { text: '返修中', cls: 'tag-return' },
        done:      { text: '已完成', cls: 'tag-done' }
      };
      return m[status] || { text: status, cls: 'tag-draft' };
    },
    calcOrderPricing(order) {
      const mat = (order.materials || []).reduce((s, x) => s + Number(x.price||0) * Number(x.qty||0), 0);
      const lab = (order.labor || []).reduce((s, x) => s + Number(x.price||0) * Number(x.qty||0), 0);
      const vis = Number(order.visitFee || 0);
      const add = (order.addItems || []).reduce((s, x) => s + (x.approved !== false ? Number(x.amount||0) : 0), 0);
      const sub = mat + lab + vis + add;
      const dis = Number(order.discount || 0);
      return {
        materials: Math.round(mat * 100) / 100,
        labor:     Math.round(lab * 100) / 100,
        visit:     Math.round(vis * 100) / 100,
        addon:     Math.round(add * 100) / 100,
        subtotal:  Math.round(sub * 100) / 100,
        discount:  Math.round(dis * 100) / 100,
        total:     Math.round((sub - dis) * 100) / 100
      };
    },
    uid() { return Math.random().toString(36).slice(2, 10); }
  };

  global.Store = Store;
  global.Util = Util;
})(window);

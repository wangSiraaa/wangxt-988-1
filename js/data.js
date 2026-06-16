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
    { code: 'M001', name: 'PPR热水管 φ25',     unit: '米',   price: 28.5,  stock: 120, category: '水电', warrantyMonths: 24 },
    { code: 'M002', name: 'PPR弯头 φ25',       unit: '个',   price: 4.5,   stock: 300, category: '水电', warrantyMonths: 24 },
    { code: 'M003', name: '国标铜线 BV-4mm²',  unit: '米',   price: 12.8,  stock: 500, category: '水电', warrantyMonths: 24 },
    { code: 'M004', name: '86型暗盒',          unit: '个',   price: 3.2,   stock: 200, category: '水电', warrantyMonths: 12 },
    { code: 'M005', name: '漏电保护器 32A',    unit: '只',   price: 68.0,  stock: 45,  category: '水电', warrantyMonths: 36 },
    { code: 'M006', name: '生料带',            unit: '卷',   price: 5.0,   stock: 80,  category: '水电', warrantyMonths: 0 },
    { code: 'M007', name: '水龙头（铜芯）',    unit: '只',   price: 185.0, stock: 22,  category: '水暖', warrantyMonths: 24 },
    { code: 'M007B', name: '水龙头（库存替代·锌合金）', unit: '只', price: 98.0, stock: 8, category: '水暖', warrantyMonths: 6, isReplacement: true, replaces: 'M007' },
    { code: 'M008', name: '角阀',              unit: '只',   price: 35.0,  stock: 60,  category: '水暖', warrantyMonths: 12 },
    { code: 'M009', name: '高压软管 50cm',     unit: '根',   price: 22.0,  stock: 100, category: '水暖', warrantyMonths: 6 },
    { code: 'M010', name: '玻璃胶（防霉）',    unit: '支',   price: 32.0,  stock: 40,  category: '辅材', warrantyMonths: 6 },
    { code: 'M011', name: '膨胀螺栓 M10',      unit: '套',   price: 2.8,   stock: 150, category: '辅材', warrantyMonths: 0 },
    { code: 'M012', name: '防臭地漏',          unit: '只',   price: 78.0,  stock: 18,  category: '水暖', warrantyMonths: 24 },
    { code: 'M013', name: '防水涂料（柔性）',  unit: '桶',   price: 260.0, stock: 12,  category: '防水', warrantyMonths: 60 },
    { code: 'M014', name: '空调支架 1.5P',     unit: '副',   price: 55.0,  stock: 35,  category: '空调', warrantyMonths: 24 },
    { code: 'M015', name: '氟利昂 R22',        unit: '公斤', price: 95.0,  stock: 50,  category: '空调', warrantyMonths: 6 },
    { code: 'M016', name: '热水器镁棒',        unit: '根',   price: 45.0,  stock: 25,  category: '家电', warrantyMonths: 6 },
    { code: 'M017', name: '洗衣机进水管',      unit: '根',   price: 18.0,  stock: 40,  category: '家电', warrantyMonths: 12 },
    { code: 'M018', name: '烟道止逆阀',        unit: '只',   price: 65.0,  stock: 15,  category: '家电', warrantyMonths: 12 },
    { code: 'M019', name: '下水道疏通剂',      unit: '瓶',   price: 28.0,  stock: 30,  category: '疏通', warrantyMonths: 0 },
    { code: 'M020', name: '密封胶带（加强型）',unit: '卷',   price: 12.0,  stock: 55,  category: '辅材', warrantyMonths: 0 },
    { code: 'M021', name: '旧电线（库存替代·非国标）', unit: '米', price: 5.8, stock: 200, category: '水电', warrantyMonths: 3, isReplacement: true, replaces: 'M003' },
    { code: 'M022', name: '墙面空鼓修补砂浆',  unit: '袋',   price: 42.0,  stock: 30,  category: '瓦工', warrantyMonths: 6 },
    { code: 'M023', name: '墙体暗埋水管开槽',  unit: '米',   price: 0,     stock: 999, category: '水电', warrantyMonths: 0 }
  ];

  const PHASE_TEMPLATES = {
    oldHouseRenovation: [
      { key: 'demolition', name: '拆除阶段', desc: '原有墙体、地砖、洁具拆除清运' },
      { key: 'hiddenWorks', name: '隐蔽工程', desc: '水电改造、防水处理、闭水试验' },
      { key: 'baseWorks', name: '基础工程', desc: '墙面找平、地砖铺贴、吊顶龙骨' },
      { key: 'finishing', name: '饰面工程', desc: '乳胶漆、墙纸、五金洁具安装' },
      { key: 'cleanup', name: '竣工清理', desc: '开荒保洁、设备调试、竣工验收' }
    ]
  };

  const FEE_TYPES = {
    DEPOSIT_DEDUCT: { key: 'deposit_deduct', name: '订金抵扣', icon: '💰', color: '#52c41a' },
    SECOND_VISIT: { key: 'second_visit', name: '二次上门', icon: '🚗', color: '#fa8c16' },
    REWORK_FREE: { key: 'rework_free', name: '返修免单', icon: '🎁', color: '#1890ff' },
    CORRECTION: { key: 'correction', name: '费用冲正', icon: '📝', color: '#722ed1' },
    ADDON_BLOCKED: { key: 'addon_blocked', name: '追加拦截', icon: '🚫', color: '#f5222d' },
    REPLACEMENT: { key: 'replacement', name: '替代件', icon: '🔄', color: '#eb2f96' }
  };

  function buildSeedOrders() {
    const now = Date.now();
    const h = 3600 * 1000;
    return [
      {
        id: 'Q20260614-001',
        createdAt: now - 28 * h,
        clientId: 'client',
        category: '老房翻修·卫生间',
        title: '老房卫生间整体翻新（完整演示）',
        description: '20年房龄老卫生间整体翻新，渗水严重，水管老化，墙皮脱落。需要全拆重装。',
        customerBudget: 15000,
        estimateUpper: 18000,
        serviceUserId: 'service',
        techUserId: 'tech',
        status: 'change',
        priceLocked: true,
        isOldHouse: true,
        phaseTemplate: 'oldHouseRenovation',
        phases: [
          { key: 'demolition', name: '拆除阶段', desc: '原有墙体、地砖、洁具拆除清运',
            status: 'done', confirmedAt: now - 20 * h, confirmedBy: 'client',
            items: [
              { id: 'p1i1', name: '原有洁具拆除（马桶/洗手盆/淋浴）', amount: 300, approved: true, confirmed: true },
              { id: 'p1i2', name: '地砖墙砖铲除', amount: 800, approved: true, confirmed: true },
              { id: 'p1i3', name: '建筑垃圾清运', amount: 400, approved: true, confirmed: true }
            ]
          },
          { key: 'hiddenWorks', name: '隐蔽工程', desc: '水电改造、防水处理、闭水试验',
            status: 'accepted', acceptedAt: now - 10 * h, acceptedBy: 'client',
            items: [
              { id: 'p2i1', name: '水电线路重新排布', amount: 2800, approved: true, confirmed: true },
              { id: 'p2i2', name: '墙面基层防水处理', amount: 1200, approved: true, confirmed: true },
              { id: 'p2i3', name: '48小时闭水试验', amount: 300, approved: true, confirmed: true },
              { id: 'p2i4', name: '水管暗改（新增）', amount: 1500, approved: true, confirmed: true, isChange: true,
                reason: '拆除后发现原有水管锈蚀严重，需全部更换PPR管', photos: ['before', 'after'] }
            ]
          },
          { key: 'baseWorks', name: '基础工程', desc: '墙面找平、地砖铺贴、吊顶龙骨',
            status: 'accepted', acceptedAt: now - 2 * h, acceptedBy: 'client',
            items: [
              { id: 'p3i1', name: '墙面空鼓修补砂浆', amount: 600, approved: true, confirmed: true, isChange: true,
                reason: '铲除后发现墙面约8㎡空鼓，需修补后才能贴砖', photos: ['hollow_wall'] },
              { id: 'p3i2', name: '墙地面找平', amount: 1500, approved: true, confirmed: true },
              { id: 'p3i3', name: '地砖铺贴', amount: 2200, approved: false, confirmed: false },
              { id: 'p3i4', name: '墙砖铺贴', amount: 2500, approved: false, confirmed: false }
            ]
          },
          { key: 'finishing', name: '饰面工程', desc: '乳胶漆、墙纸、五金洁具安装',
            status: 'pending',
            items: [
              { id: 'p4i1', name: '吊顶集成安装', amount: 1800, approved: false, confirmed: false },
              { id: 'p4i2', name: '洁具安装（马桶/洗手盆/淋浴）', amount: 1200, approved: false, confirmed: false }
            ]
          },
          { key: 'cleanup', name: '竣工清理', desc: '开荒保洁、设备调试、竣工验收',
            status: 'pending',
            items: [
              { id: 'p5i1', name: '开荒保洁', amount: 500, approved: false, confirmed: false },
              { id: 'p5i2', name: '整体调试验收', amount: 200, approved: false, confirmed: false }
            ]
          }
        ],
        survey: {
          visitedAt: now - 26 * h,
          photos: ['survey_overview', 'water_leak', 'old_pipes', 'wall_damage'],
          diagnosis: '1. 防水层完全失效，地砖缝渗水到楼下；\n2. 原有镀锌水管锈蚀严重，多处暗漏；\n3. 墙面约8㎡空鼓，基层松散；\n4. 淋浴龙头陶瓷阀芯磨损。\n\n建议全拆重装，水电全部走新管，防水重做，墙面空鼓修补后再贴砖。',
          areaSize: '约 4㎡ 地面 + 墙面返高 1.8m + 吊顶',
          difficulty: '复杂',
          secondVisitRequired: true,
          reworkRisk: 'high'
        },
        materials: [
          { code: 'M013', name: '防水涂料（柔性）', unit: '桶', price: 260, qty: 3, warrantyMonths: 60, confirmed: true },
          { code: 'M001', name: 'PPR热水管 φ25', unit: '米', price: 28.5, qty: 35, warrantyMonths: 24, confirmed: true },
          { code: 'M003', name: '国标铜线 BV-4mm²', unit: '米', price: 12.8, qty: 60, warrantyMonths: 24, confirmed: true,
            feeType: 'replacement', replacedFrom: 'M021', replacedNote: '原计划用库存旧线，客户要求换新国标线，补差价' },
          { code: 'M007B', name: '水龙头（库存替代·锌合金）', unit: '只', price: 98, qty: 1, warrantyMonths: 6, confirmed: true,
            feeType: 'replacement', replacedFrom: 'M007', replacedNote: '原铜芯龙头缺货，使用库存替代件，保修期调整为6个月' },
          { code: 'M022', name: '墙面空鼓修补砂浆', unit: '袋', price: 42, qty: 15, warrantyMonths: 6, confirmed: true, isChange: true },
          { code: 'M008', name: '角阀', unit: '只', price: 35, qty: 5, warrantyMonths: 12, confirmed: true },
          { code: 'M010', name: '玻璃胶（防霉）', unit: '支', price: 32, qty: 5, warrantyMonths: 6, confirmed: true }
        ],
        labor: [
          { item: '原有装修全拆+清运', unit: '项', price: 1500, qty: 1, confirmed: true, phaseKey: 'demolition' },
          { item: '水电线路重新排布', unit: '项', price: 2800, qty: 1, confirmed: true, phaseKey: 'hiddenWorks' },
          { item: '防水基层清理与涂刷', unit: '项', price: 1800, qty: 1, confirmed: true, phaseKey: 'hiddenWorks' },
          { item: '48小时闭水试验', unit: '次', price: 300, qty: 1, confirmed: true, phaseKey: 'hiddenWorks' },
          { item: '墙面空鼓修补', unit: '项', price: 600, qty: 1, confirmed: true, phaseKey: 'baseWorks', isChange: true,
            reason: '铲除后发现墙面空鼓超出预期' },
          { item: '墙地面找平', unit: '项', price: 1500, qty: 1, confirmed: true, phaseKey: 'baseWorks' },
          { item: '地砖铺贴', unit: '项', price: 2200, qty: 1, confirmed: false, phaseKey: 'baseWorks' },
          { item: '墙砖铺贴', unit: '项', price: 2500, qty: 1, confirmed: false, phaseKey: 'baseWorks' },
          { item: '二次上门费', unit: '次', price: 0, qty: 1, confirmed: true, feeType: 'second_visit',
            note: '拆除后复勘，免二次上门费' }
        ],
        visitFee: 100,
        addItems: [
          { name: '水管暗改（全房更换）', amount: 1500, reason: '拆除后发现原有镀锌水管锈蚀严重，存在暗漏风险，需全部更换PPR管',
            approved: true, changeId: 'C002', photos: ['old_pipe_rust', 'new_pipe_install'], confirmed: true,
            feeType: 'addon' },
          { name: '墙面空鼓大面积修补', amount: 600, reason: '铲除地砖后发现墙面约8㎡空鼓，基层松散，必须修补后才能贴砖',
            approved: true, changeId: 'C003', photos: ['hollow_before', 'hollow_after'], confirmed: true,
            feeType: 'addon' },
          { name: '旧电线全部更换', amount: 420, reason: '原计划用库存旧线(M021)，客户要求全部更换新国标铜线(M003)，补差价',
            approved: true, changeId: 'C004', confirmed: true, feeType: 'replacement' },
          { name: '完工后追加保洁费', amount: 300, reason: '施工完成后客户要求增加深度保洁',
            approved: false, rejected: true, rejectReason: '已完工，追加项目必须走变更单且客户确认前不得施工',
            feeType: 'addon_blocked', blockedAt: now - 1 * h, blockedBy: 'system' }
        ],
        feeAdjustments: [
          { type: 'deposit_deduct', amount: -5000, note: '订金抵扣（30%）', createdAt: now - 18 * h, createdBy: 'reviewer' },
          { type: 'second_visit', amount: 0, note: '二次上门（复勘）· 免单', createdAt: now - 24 * h, createdBy: 'service' },
          { type: 'rework_free', amount: -200, note: '返修免单：闭水试验一次不合格，免费重做', createdAt: now - 12 * h, createdBy: 'service' },
          { type: 'correction', amount: -100, note: '费用冲正：多收了一个角阀钱', createdAt: now - 6 * h, createdBy: 'reviewer' }
        ],
        warranty: {
          months: 24,
          scope: '整体工程24个月，防水60个月，水电24个月，替代件按各自保修期。非人为损坏免费返修。',
          items: [
            { code: 'M013', name: '防水涂料', months: 60 },
            { code: 'M001', name: 'PPR水管', months: 24 },
            { code: 'M007B', name: '替代水龙头', months: 6 },
            { code: 'M003', name: '国标铜线', months: 24 }
          ]
        },
        pricing: {
          materials: 4876,
          labor: 13400,
          visit: 100,
          addon: 2520,
          adjustment: -5300,
          subtotal: 15596,
          discount: 0,
          total: 15596
        },
        overEstimateReason: '1. 拆除后发现水管锈蚀需全换(+¥1500)；\n2. 墙面空鼓超预期需修补(+¥600)；\n3. 客户要求旧线全部换新国标线(+¥420)；\n合计追加 ¥2520，已通过变更单客户确认。',
        reviewStatus: 'approved',
        reviewedAt: now - 21 * h,
        reviewedBy: 'reviewer',
        timeline: [
          { type: 'status', sub: 'created', title: '客服创建需求', time: now - 28 * h, userId: 'service',
            content: '老房卫生间整体翻新，20年房龄，渗水+水管老化+墙皮脱落。客户预算 ¥15,000，预估上限 ¥18,000。',
            meta: [{ k: '房龄', v: '20年' }, { k: '风险等级', v: '高' }] },
          { type: 'status', sub: 'assigned', title: '派单', time: now - 27 * h, userId: 'service',
            content: '指派李师傅（资深工长）上门勘查，已告知这是老房翻修，先拆后看问题。',
            meta: [{ k: '派给', v: '李师傅' }, { k: '备注', v: '需二次上门复勘' }] },
          { type: 'status', sub: 'survey', title: '首次上门勘查', time: now - 26 * h, userId: 'tech',
            content: '现场勘查完成，拍了4张照片。问题比预期严重：水管锈蚀、墙面空鼓、防水失效。已与客户口头沟通可能需要变更。',
            meta: [{ k: '勘查照片', v: '4张' }, { k: '施工难度', v: '复杂' }] },
          { type: 'status', sub: 'priced', title: '初始报价生成', time: now - 25 * h, userId: 'tech',
            content: '初始报价 ¥13,076，未超预估上限。包含拆除、水电、防水、贴砖、洁具安装。' },
          { type: 'status', sub: 'pending', title: '客户待确认（初始报价）', time: now - 25 * h, userId: 'tech',
            content: '报价已提交客户。注：老房翻修，拆除后可能需要变更。' },
          { type: 'status', sub: 'confirmed', title: '客户确认报价', time: now - 24 * h, userId: 'client',
            content: '已确认初始报价，支付 30% 订金 ¥5,000。已知晓拆除后可能有变更。',
            meta: [{ k: '订金', v: '¥5,000.00' }, { k: '抵扣比例', v: '30%' }] },
          { type: 'finance', sub: 'deposit', title: '收到订金', time: now - 23.5 * h, userId: 'reviewer',
            content: '收到客户订金 ¥5,000，已标记为「订金抵扣」。',
            meta: [{ k: '金额', v: '¥5,000.00' }, { k: '费用类型', v: '订金抵扣' }] },
          { type: 'status', sub: 'working', title: '开工（报价锁价）', time: now - 23 * h, userId: 'tech',
            content: '开始拆除施工。原始报价已锁价 🔒，后续任何调整必须走变更单流程。',
            meta: [{ k: '状态', v: '🔒 原始报价已锁价' }] },
          { type: 'phase', sub: 'demolition_done', title: '拆除阶段完成', time: now - 22 * h, userId: 'tech',
            content: '拆除完成，共清运5袋建渣。准备进行下一阶段前发现问题...',
            meta: [{ k: '阶段', v: '拆除阶段' }, { k: '状态', v: '✅ 完成' }] },
          { type: 'change', sub: 'requested', title: '变更单 C002：水管暗改', time: now - 21.5 * h, userId: 'tech',
            content: '拆除后发现原有镀锌水管严重锈蚀，多处沙眼暗漏。必须全部更换PPR管，追加 ¥1,500。已拍照片。',
            meta: [{ k: '变更单号', v: 'C002' }, { k: '追加金额', v: '+¥1,500' }, { k: '照片', v: '2张' }] },
          { type: 'change', sub: 'requested', title: '变更单 C003：墙面空鼓修补', time: now - 21 * h, userId: 'tech',
            content: '铲除后发现墙面约8㎡空鼓，基层松散。必须修补后才能贴砖，追加 ¥600。已拍照片。',
            meta: [{ k: '变更单号', v: 'C003' }, { k: '追加金额', v: '+¥600' }, { k: '照片', v: '2张' }] },
          { type: 'status', sub: 'review', title: '超预估复核（自动触发）', time: now - 21 * h, userId: 'system',
            content: '两项变更合计追加 ¥2,100，总额将达 ¥15,176。虽未超 ¥18,000 上限，但变更金额较大，自动进入财务复核。',
            meta: [{ k: '当前总额', v: '¥15,176' }, { k: '预估上限', v: '¥18,000' }] },
          { type: 'finance', sub: 'review_ok', title: '财务复核通过', time: now - 20.5 * h, userId: 'reviewer',
            content: '复核通过。变更原因合理，照片齐全，金额在合理范围。已推送客户确认。',
            meta: [{ k: '复核人', v: '赵会计' }, { k: '结论', v: '通过' }] },
          { type: 'status', sub: 'change', title: '变更待客户确认', time: now - 20 * h, userId: 'tech',
            content: '两项变更单已推送陈女士确认。' },
          { type: 'change', sub: 'approved', title: '客户确认两项变更', time: now - 19 * h, userId: 'client',
            content: '已查看照片和原因，同意 C002（水管暗改 +¥1,500）和 C003（空鼓修补 +¥600）两项变更。',
            meta: [{ k: '确认变更', v: 'C002、C003' }, { k: '追加合计', v: '+¥2,100' }] },
          { type: 'phase', sub: 'hiddenWorks_start', title: '隐蔽工程开始', time: now - 18 * h, userId: 'tech',
            content: '开始水电改造和防水施工。' },
          { type: 'change', sub: 'requested', title: '变更单 C004：旧线换新线', time: now - 17 * h, userId: 'tech',
            content: '客户看到库存旧线（M021，保修期仅3个月），要求全部更换新国标铜线（M003，保修期24个月）。材料差价 +¥420。',
            meta: [{ k: '变更单号', v: 'C004' }, { k: '追加金额', v: '+¥420' }, { k: '类型', v: '替代件' }] },
          { type: 'change', sub: 'approved', title: '客户确认替代件变更', time: now - 16.5 * h, userId: 'client',
            content: '同意使用新国标铜线，保修期延长至24个月，接受差价 ¥420。同时确认水龙头用库存替代件（保修期6个月）。',
            meta: [{ k: '替代件', v: 'M003替代M021' }, { k: '保修期变更', v: '3个月→24个月' }] },
          { type: 'status', sub: 'working', title: '继续施工', time: now - 16 * h, userId: 'tech',
            content: '变更确认完毕，继续施工。当前总额：¥15,596。' },
          { type: 'phase', sub: 'hiddenWorks_done', title: '隐蔽工程完成·待验收', time: now - 14 * h, userId: 'tech',
            content: '水电改造、防水涂刷完成。做48小时闭水试验中。已拍打压测试照片。' },
          { type: 'status', sub: 'checking', title: '隐蔽工程验收中', time: now - 12 * h, userId: 'tech',
            content: '闭水试验合格，但有一处防水边角涂刷不均匀，免费重做。',
            meta: [{ k: '返修', v: '免费' }, { k: '费用类型', v: '返修免单' }] },
          { type: 'phase', sub: 'hiddenWorks_accept', title: '隐蔽工程验收通过', time: now - 10 * h, userId: 'client',
            content: '客户验收通过。已打压测试（1.2MPa 30分钟压降0），闭水试验楼下无渗漏。签字确认。',
            meta: [{ k: '验收', v: '通过' }, { k: '阶段', v: '隐蔽工程' }] },
          { type: 'phase', sub: 'baseWorks_start', title: '基础工程开始', time: now - 9 * h, userId: 'tech',
            content: '开始墙面找平、地砖铺贴。' },
          { type: 'finance', sub: 'correction', title: '费用冲正', time: now - 6 * h, userId: 'reviewer',
            content: '发现材料清单多算了1个角阀，冲正 -¥100。已通知客户。',
            meta: [{ k: '冲正金额', v: '-¥100' }, { k: '原因', v: '多算角阀' }] },
          { type: 'phase', sub: 'baseWorks_accept', title: '基础工程（部分）验收', time: now - 2 * h, userId: 'client',
            content: '墙面找平验收通过。但客户只确认了前2项（空鼓修补、找平），地砖和墙砖铺贴暂缓确认。',
            meta: [{ k: '部分确认', v: '是' }, { k: '已确认', v: '2项' }, { k: '待确认', v: '2项' }] },
          { type: 'status', sub: 'change', title: '有未确认项目，禁止开工', time: now - 1 * h, userId: 'system',
            content: '客户未确认地砖和墙砖铺贴项目，系统自动禁止该部分施工。已通知李师傅。',
            meta: [{ k: '未确认项目', v: '地砖铺贴、墙砖铺贴' }, { k: '状态', v: '🚫 禁止开工' }] },
          { type: 'finance', sub: 'addon_blocked', title: '完工追加收费拦截', time: now - 0.5 * h, userId: 'system',
            content: '拦截一项完工后追加的保洁费 ¥300。原因：已进入基础工程阶段，追加项目必须走变更单且客户确认前不得施工。',
            meta: [{ k: '拦截项目', v: '深度保洁 ¥300' }, { k: '拦截原因', v: '完工后追加，未走变更单' }] }
        ],
        changeOrders: [
          {
            id: 'C002',
            createdAt: now - 21.5 * h,
            createdBy: 'tech',
            type: 'hidden_mod',
            title: '水管暗改（全房更换）',
            items: [
              { name: '原有镀锌水管拆除', amount: 500, reason: '锈蚀严重，有暗漏风险', photos: ['rusty_pipe1', 'rusty_pipe2'] },
              { name: 'PPR新管安装（35米）', amount: 1000, reason: '全部走新管，热熔连接', photos: ['new_pipe1', 'new_pipe2'] }
            ],
            totalAdd: 1500,
            status: 'approved',
            approvedAt: now - 19 * h,
            approvedBy: 'client',
            photos: ['before_demolition', 'after_pipe_install', 'pressure_test'],
            diagnosis: '拆除后发现原有镀锌水管使用20年，严重锈蚀，多处沙眼，随时可能爆管。必须全部更换。'
          },
          {
            id: 'C003',
            createdAt: now - 21 * h,
            createdBy: 'tech',
            type: 'structure',
            title: '墙面空鼓大面积修补',
            items: [
              { name: '8㎡墙面空鼓铲除', amount: 300, reason: '基层松散，附着力为0', photos: ['hollow_wall1', 'hollow_wall2'] },
              { name: '界面剂+砂浆找平', amount: 300, reason: '修补后才能贴砖，否则墙砖脱落', photos: ['repair_after'] }
            ],
            totalAdd: 600,
            status: 'approved',
            approvedAt: now - 19 * h,
            approvedBy: 'client',
            photos: ['hollow_before', 'hollow_mid', 'hollow_after'],
            diagnosis: '铲除地砖后发现墙面约8㎡空鼓，用空鼓锤检测声音发闷。如不修补直接贴砖，1-2年内必然脱落。'
          },
          {
            id: 'C004',
            createdAt: now - 17 * h,
            createdBy: 'tech',
            type: 'replacement',
            title: '旧电线全部更换为新国标铜线',
            items: [
              { name: '库存旧线(M021)换国标铜线(M003)', amount: 420, reason: '客户要求，保修期从3个月延长至24个月',
                isReplacement: true, oldCode: 'M021', newCode: 'M003', oldWarranty: 3, newWarranty: 24,
                oldPrice: 5.8, newPrice: 12.8, qtyDiff: 60 }
            ],
            totalAdd: 420,
            status: 'approved',
            approvedAt: now - 16.5 * h,
            approvedBy: 'client',
            photos: ['old_wire', 'new_wire'],
            diagnosis: '原计划使用库存旧线（非国标，保修期仅3个月），客户看到实物后要求全部更换新国标铜线（BV-4mm²，保修期24个月）。材料差价：(12.8-5.8)×60米 = ¥420。'
          }
        ],
        invoices: [
          { id: 'INV001', amount: 5000, date: now - 23.5 * h, status: 'issued', note: '订金发票' }
        ],
        deposit: 5000,
        reworkCount: 1,
        lastReworkAt: now - 12 * h,
        lastReworkNote: '防水边角涂刷不均匀，免费重做',
        confirmedItems: ['p1i1', 'p1i2', 'p1i3', 'p2i1', 'p2i2', 'p2i3', 'p2i4', 'p3i1', 'p3i2'],
        blockedItems: {
          'p3i3': { reason: '客户未确认地砖铺贴项目', blockedAt: now - 1 * h },
          'p3i4': { reason: '客户未确认墙砖铺贴项目', blockedAt: now - 1 * h }
        }
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
    materials() { return deepClone(this.load().materials); },

    getPendingChangesForClient(clientId) {
      return this.getOrders()
        .filter(o => o.clientId === clientId && (o.status === 'change' || o.status === 'review'))
        .flatMap(o => (o.changeOrders || []).filter(c => c.status === 'pending').map(c => ({ ...c, orderId: o.id, orderTitle: o.title })));
    },

    getPhases(orderId) {
      const o = this.getOrder(orderId);
      return o.phases || [];
    },

    getUnconfirmedItems(orderId) {
      const o = this.getOrder(orderId);
      const items = [];
      (o.phases || []).forEach(p => {
        (p.items || []).forEach(it => {
          if (!it.confirmed) items.push({ ...it, phaseKey: p.key, phaseName: p.name });
        });
      });
      return items;
    },

    getFeeAdjustments(orderId) {
      const o = this.getOrder(orderId);
      return o.feeAdjustments || [];
    },

    getWarrantyByMaterial(orderId, materialCode) {
      const o = this.getOrder(orderId);
      const mat = (o.warranty?.items || []).find(w => w.code === materialCode);
      if (mat) return mat.months;
      const catalog = MATERIAL_CATALOG.find(m => m.code === materialCode);
      return catalog?.warrantyMonths || 0;
    },

    isBlocked(orderId, itemId) {
      const o = this.getOrder(orderId);
      return !!(o && o.blockedItems && o.blockedItems[itemId]);
    },

    getReplacementOptions(materialCode) {
      return MATERIAL_CATALOG.filter(m => m.isReplacement && m.replaces === materialCode);
    },

    getPhaseStatusLabel(status) {
      const m = {
        pending: { text: '待开始', cls: 'tag-draft' },
        working: { text: '进行中', cls: 'tag-working' },
        done: { text: '已完成', cls: 'tag-done' },
        accepted: { text: '已验收', cls: 'tag-confirmed' },
        rejected: { text: '已驳回', cls: 'tag-return' }
      };
      return m[status] || { text: status, cls: 'tag-draft' };
    }
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

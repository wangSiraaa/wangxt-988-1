/* global window, Store, Util, State, UI, Timeline, App */
(function (global) {

  function runSafely(fn) {
    try { fn(); }
    catch (e) { UI.toast(e.isBiz ? e.message : ('错误：' + e.message), 'error', 4000); }
  }

  const TechPanel = {

    dashboard() {
      const me = Store.currentRole();
      const my = Store.orders(o => o.techUserId === me.id);
      const todo = my.filter(o => ['assigned','surveying'].includes(o.status));
      const pricing = my.filter(o => ['priced','returned','review','pending'].includes(o.status));
      const working = my.filter(o => ['working','change','checking','rework','confirmed'].includes(o.status));
      const done = my.filter(o => o.status === 'done');
      return `
        <div class="page-header">
          <div><h2>师傅工作台 · 概览</h2><div class="sub">${me.name}（${me.title}）</div></div>
        </div>
        <div class="order-summary-grid">
          <div class="stat-card orange"><div class="num">${todo.length}</div><div class="label">待勘查 / 待上门</div></div>
          <div class="stat-card"><div class="num">${pricing.length}</div><div class="label">报价中 / 待客户确认</div></div>
          <div class="stat-card"><div class="num">${working.length}</div><div class="label">施工中 / 待验收</div></div>
          <div class="stat-card green"><div class="num">${done.length}</div><div class="label">已完工</div></div>
        </div>
        <div class="card">
          <div class="card-title">🛠️ 我的工单</div>
          ${my.length ? ServicePanel_orderListView.call(this, my) : UI.emptyState('暂无指派给您的工单，请等待客服派单', '☕')}
        </div>`;
    },

    listTodo() {
      const me = Store.currentRole();
      const list = Store.orders(o => o.techUserId === me.id && ['assigned','surveying'].includes(o.status));
      return `
        <div class="page-header"><div><h2>待勘查 / 待上门</h2>
          <div class="sub">共 ${list.length} 个工单待处理</div></div></div>
        <div class="card">
          ${list.length ? ServicePanel_orderListView.call(this, list) : UI.emptyState('待勘查工单已全部完成，干得漂亮！', '🎉')}
        </div>`;
    },

    listPricing() {
      const me = Store.currentRole();
      const list = Store.orders(o => o.techUserId === me.id && ['priced','returned','review','pending'].includes(o.status));
      return `
        <div class="page-header"><div><h2>报价管理</h2>
          <div class="sub">勘查后报价、被退回重报、客户确认中等。共 ${list.length} 条。</div></div></div>
        <div class="card">
          ${list.length ? ServicePanel_orderListView.call(this, list) : UI.emptyState('暂无报价管理类工单')}
        </div>`;
    },

    listWorking() {
      const me = Store.currentRole();
      const list = Store.orders(o => o.techUserId === me.id && ['confirmed','working','change','checking','rework'].includes(o.status));
      return `
        <div class="page-header"><div><h2>施工管理</h2>
          <div class="sub">已确认报价/施工中/变更/验收阶段。共 ${list.length} 条。</div></div></div>
        <div class="card">
          ${list.length ? ServicePanel_orderListView.call(this, list) : UI.emptyState('暂无施工中工单')}
        </div>`;
    },

    listDone() {
      const me = Store.currentRole();
      const list = Store.orders(o => o.techUserId === me.id && o.status === 'done');
      return `
        <div class="page-header"><div><h2>已完工</h2>
          <div class="sub">共 ${list.length} 条</div></div></div>
        <div class="card">
          ${list.length ? ServicePanel_orderListView.call(this, list) : UI.emptyState('暂无完工工单')}
        </div>`;
    },

    orderDetail(orderId) {
      const order = Store.getOrder(orderId);
      if (!order) return UI.emptyState('工单不存在');
      const users = Store.users();
      const tech = order.techUserId ? users[order.techUserId] : null;
      const client = users[order.clientId];
      const me = Store.currentRole();
      const isMine = order.techUserId === me.id;

      const actions = [];
      if (isMine && order.status === 'assigned') {
        actions.push(`<button class="btn btn-primary" onclick="TechPanel.markSurveying('${order.id}')">🚗 出发前往勘查</button>`);
      }
      if (isMine && ['surveying','priced','returned','review','pending','draft'].includes(order.status) && !order.priceLocked) {
        actions.push(`<button class="btn btn-warning" onclick="TechPanel.editQuoteModal('${order.id}')">✏️ 编辑报价 / 勘查 / 材料 / 工时</button>`);
      }
      if (isMine && order.status === 'confirmed') {
        actions.push(`<button class="btn btn-success btn-lg" onclick="TechPanel.confirmStartWork('${order.id}')">🛠️ 开工（报价将锁价）</button>`);
      }
      if (isMine && order.priceLocked && (order.status === 'working' || order.status === 'change')) {
        actions.push(`<button class="btn btn-warning" onclick="TechPanel.changeOrderModal('${order.id}')">📋 申请变更单（锁价后仅可走变更）</button>`);
      }
      if (isMine && (order.status === 'working' || order.status === 'rework')) {
        actions.push(`<button class="btn btn-success" onclick="TechPanel.finishWork('${order.id}')">✅ 完工，申请验收</button>`);
      }
      actions.push(`<button class="btn btn-secondary" onclick="App.sendMessage('${order.id}')">💬 发消息</button>`);

      const canEditPrice = !order.priceLocked && isMine && ['surveying','priced','returned','review','pending','draft'].includes(order.status);

      return `
        <div class="page-header">
          <div>
            <h2>
              <button class="btn btn-secondary btn-sm" onclick="App.router.back()" style="margin-right:10px">← 返回</button>
              工单详情 · ${order.title}
              <span class="tag ${Util.statusLabel(order.status).cls}" style="margin-left:10px">${Util.statusLabel(order.status).text}</span>
              ${order.priceLocked ? '<span title="已开工锁价" style="margin-left:6px">🔒</span>' : ''}
            </h2>
            <div class="sub"><code>${order.id}</code> · 创建于 ${Util.fmtTime(order.createdAt)}</div>
          </div>
          <div>${actions.join('')}</div>
        </div>

        ${UI.statusBanner(order)}

        <div class="card">
          <div class="card-title">基本信息</div>
          <div class="form-grid">
            <div class="field-row"><span class="f-label">报修分类</span><span class="f-value">${order.category}</span></div>
            <div class="field-row"><span class="f-label">报修客户</span><span class="f-value">${client.name}（${client.phone || ''}）</span></div>
            <div class="field-row"><span class="f-label">服务地址</span><span class="f-value">${client.address || '—'}</span></div>
            <div class="field-row"><span class="f-label">指派师傅</span><span class="f-value">${tech ? (tech.name + ' · ' + tech.title) : '未指派'}</span></div>
            <div class="field-row"><span class="f-label">客户心理价</span><span class="f-value">${Util.fmtMoney(order.customerBudget)}</span></div>
            <div class="field-row"><span class="f-label">客服预估上限</span><span class="f-value"><b style="color:#667eea">${Util.fmtMoney(order.estimateUpper)}</b></span></div>
          </div>
          <div class="divider"></div>
          <div class="section-title">📝 客户描述</div>
          <div style="line-height:1.7;color:#4a5568;background:#fafbfc;padding:12px 16px;border-radius:6px">${order.description}</div>
        </div>

        ${order.survey ? `
        <div class="card">
          <div class="card-title">🏠 上门勘查结果${canEditPrice ? `<button class="btn btn-secondary btn-sm" style="margin-left:auto" onclick="TechPanel.editQuoteModal('${order.id}')">编辑</button>` : ''}</div>
          <div class="form-grid">
            <div class="field-row"><span class="f-label">勘查时间</span><span class="f-value">${Util.fmtTime(order.survey.visitedAt)}</span></div>
            <div class="field-row"><span class="f-label">勘查师傅</span><span class="f-value">${tech ? tech.name : '—'}</span></div>
            <div class="field-row"><span class="f-label">施工范围</span><span class="f-value">${order.survey.areaSize || '—'}</span></div>
            <div class="field-row"><span class="f-label">难度</span><span class="f-value">${order.survey.difficulty || '—'}</span></div>
          </div>
          <div class="divider"></div>
          <div class="section-title">🔍 故障诊断</div>
          <div style="line-height:1.7;color:#4a5568;background:#f0f9ff;padding:12px 16px;border-radius:6px;white-space:pre-wrap">${order.survey.diagnosis}</div>
        </div>` : (canEditPrice ? `
        <div class="card">
          <div class="card-title">🏠 上门勘查（未填写）</div>
          <div style="padding:10px 0">点击下方按钮开始录入勘查结果和报价明细。</div>
          <button class="btn btn-primary" onclick="TechPanel.editQuoteModal('${order.id}')">📝 录入勘查与报价</button>
        </div>` : '')}

        <div class="card">
          <div class="card-title">📦 材料清单
            ${canEditPrice ? `<button class="btn btn-secondary btn-sm" style="margin-left:auto" onclick="TechPanel.editQuoteModal('${order.id}')">编辑</button>` : ''}
          </div>
          ${order.materials && order.materials.length
            ? UI.materialsTable(order, false)
            : (canEditPrice
                ? '<div style="color:#909399;padding:10px 0">暂未添加材料。点击右上角「编辑报价」从备件库中选择或手动添加。</div>'
                : '<div style="color:#909399;padding:10px 0">暂无材料</div>')}
        </div>

        <div class="card">
          <div class="card-title">⏱️ 工时与单价
            ${canEditPrice ? `<button class="btn btn-secondary btn-sm" style="margin-left:auto" onclick="TechPanel.editQuoteModal('${order.id}')">编辑</button>` : ''}
          </div>
          ${order.labor && order.labor.length
            ? UI.laborTable(order, false)
            : (canEditPrice
                ? '<div style="color:#909399;padding:10px 0">暂未添加工时项目。点击右上角「编辑报价」录入。</div>'
                : '<div style="color:#909399;padding:10px 0">暂无工时项目</div>')}
        </div>

        ${order.addItems && order.addItems.length ? `
        <div class="card">
          <div class="card-title">➕ 追加 / 变更项</div>
          ${UI.addItemsTable(order.addItems, order.changeOrders)}
        </div>` : ''}

        <div class="card">
          <div class="card-title">💰 报价明细（总额 ${Util.fmtMoney(order.pricing.total)}）
            ${canEditPrice ? `<button class="btn btn-secondary btn-sm" style="margin-left:auto" onclick="TechPanel.editQuoteModal('${order.id}')">编辑</button>` : ''}
          </div>
          ${UI.pricingBreakdown(order)}
          <div class="divider"></div>
          ${UI.warrantyBox(order) || '<div style="color:#909399">暂未设置保修期</div>'}
        </div>

        <div class="card">
          <div class="card-title">📜 状态时间线</div>
          ${Timeline.render(order)}
        </div>
      `;
    },

    markSurveying(orderId) {
      runSafely(() => {
        State.markSurveying(orderId);
        UI.toast('已标记为出发勘查', 'success');
        App.router.refresh();
      });
    },

    confirmStartWork(orderId) {
      runSafely(async () => {
        const order = Store.getOrder(orderId);
        const ok = await UI.confirm('确认开工？',
          `<div>客户已确认报价 <b>${Util.fmtMoney(order.pricing.total)}</b>。</div>
           <div style="margin-top:10px;color:#a8071a">⚠️ 开工后，<b>原始报价将立即锁价 🔒</b>，不得直接修改。</div>
           <div style="margin-top:4px;color:#a8071a">如需增项或改价，必须走「变更单」流程并获得客户确认。</div>
           <div style="margin-top:12px">确定立即开工吗？</div>`,
          '✅ 确认开工', '取消', true);
        if (!ok) return;
        State.startWork(orderId);
        UI.toast('已开工，原始报价已锁价 🔒', 'success', 3500);
        App.router.refresh();
      });
    },

    async finishWork(orderId) {
      const note = await UI.prompt('完工说明', {
        label: '请简要描述施工完成情况（客户验收依据）：',
        multiline: true, rows: 3, required: false,
        default: '施工完毕，所有项目按方案执行，现场已清理。'
      });
      if (note === null) return;
      runSafely(() => {
        State.finishWork(orderId, note);
        UI.toast('已提交完工验收申请', 'success');
        App.router.refresh();
      });
    },

    editQuoteModal(orderId) {
      runSafely(() => {
        State.tryEditPrice(orderId);
        const order = Store.getOrder(orderId);
        const catalog = Store.materials();
        const byCategory = {};
        catalog.forEach(m => {
          (byCategory[m.category] = byCategory[m.category] || []).push(m);
        });
        const me = Store.currentRole();

        const bodyHtml = () => {
          const mats = window.__editQuoteMats || (order.materials || []).slice();
          const labs = window.__editQuoteLabs || (order.labor || []).slice();
          const vis = window.__editQuoteVis !== undefined ? window.__editQuoteVis : (order.visitFee || 0);
          const war = window.__editQuoteWar || Object.assign({ months: 6, scope: '非人为损坏工艺保修' }, order.warranty || {});
          const surv = window.__editQuoteSurv || Object.assign({
            diagnosis: '', areaSize: '', difficulty: '中等', visitedAt: Date.now()
          }, order.survey || {});
          const overReason = window.__editQuoteOverReason || order.overEstimateReason || '';
          const pricing = Util.calcOrderPricing({ materials: mats, labor: labs, visitFee: vis, addItems: order.addItems });
          const over = pricing.total > (order.estimateUpper || 0);

          const catOptions = Object.keys(byCategory).map(c => {
            const items = byCategory[c].map(m => {
              const stockCls = m.stock > 20 ? 'in-stock' : m.stock > 0 ? 'low-stock' : 'out-stock';
              const stockTxt = m.stock > 20 ? '库存充足' : m.stock > 0 ? `仅剩 ${m.stock}` : '缺货';
              return `<option value="${m.code}" data-stock="${m.stock}" data-price="${m.price}" data-unit="${m.unit}" data-name="${m.name}">
                ${m.name}（${Util.fmtMoney(m.price)}/${m.unit} · ${stockTxt}）
              </option>`;
            }).join('');
            return `<optgroup label="${c}">${items}</optgroup>`;
          }).join('');

          const matRows = mats.map((m, i) => {
            const total = (Number(m.price) || 0) * (Number(m.qty) || 0);
            return `<tr data-i="${i}">
              <td><input class="e-code" value="${m.code || ''}" style="width:100%;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px;font-size:12px" readonly /></td>
              <td><input class="e-name" value="${m.name || ''}" style="width:100%;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px" /></td>
              <td><input class="e-unit" value="${m.unit || ''}" style="width:60px;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px" /></td>
              <td><input class="e-price" type="number" step="0.01" value="${Number(m.price||0).toFixed(2)}" style="width:90px;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px" /></td>
              <td><input class="e-qty" type="number" step="1" value="${Number(m.qty||0)}" style="width:70px;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px" /></td>
              <td style="color:#ff4b2b;font-weight:600">${Util.fmtMoney(total)}</td>
              <td><button class="btn btn-danger btn-sm e-mdel">删除</button></td>
            </tr>`;
          }).join('') || `<tr><td colspan="7" class="empty">点击下方「从备件库选择」添加材料</td></tr>`;

          const labRows = labs.map((l, i) => {
            const total = (Number(l.price) || 0) * (Number(l.qty) || 0);
            return `<tr data-i="${i}">
              <td><input class="e-litem" value="${l.item || ''}" style="width:100%;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px" /></td>
              <td><input class="e-lunit" value="${l.unit || '项'}" style="width:80px;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px" /></td>
              <td><input class="e-lprice" type="number" step="0.01" value="${Number(l.price||0).toFixed(2)}" style="width:100px;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px" /></td>
              <td><input class="e-lqty" type="number" step="1" value="${Number(l.qty||0)}" style="width:70px;padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px" /></td>
              <td style="color:#ff4b2b;font-weight:600">${Util.fmtMoney(total)}</td>
              <td><button class="btn btn-danger btn-sm e-ldel">删除</button></td>
            </tr>`;
          }).join('') || `<tr><td colspan="6" class="empty">点击「添加工时项」添加</td></tr>`;

          return `
          <div class="tabs" id="e-tabs">
            <div class="tab active" data-tab="survey">🏠 勘查</div>
            <div class="tab" data-tab="materials">📦 材料</div>
            <div class="tab" data-tab="labor">⏱️ 工时</div>
            <div class="tab" data-tab="extra">➕ 上门费/保修</div>
            <div class="tab" data-tab="summary">💰 汇总</div>
          </div>

          <div data-panel="survey">
            <div class="form-row"><label><span class="req">*</span>故障诊断（详细说明问题根因与施工方案）</label>
              <textarea class="e-diagnosis" rows="4" placeholder="如：防水层老化导致渗水 + 龙头阀芯磨损需更换...">${surv.diagnosis || ''}</textarea>
            </div>
            <div class="form-grid">
              <div class="form-row"><label>施工范围/面积</label>
                <input class="e-area" value="${surv.areaSize || ''}" placeholder="如：约 4㎡ 地面 + 墙面返高 30cm" />
              </div>
              <div class="form-row"><label>施工难度</label>
                <select class="e-diff">
                  ${['简单','中等','复杂'].map(d => `<option ${surv.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <div data-panel="materials" style="display:none">
            <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center">
              <select id="e-catalog" style="flex:1;padding:6px 10px;border:1px solid #dcdfe6;border-radius:6px">
                <option value="">— 从备件库中选择（按分类）—</option>
                ${catOptions}
              </select>
              <input id="e-stock-qty" type="number" min="1" value="1" placeholder="数量" style="width:80px;padding:6px 8px;border:1px solid #dcdfe6;border-radius:6px" />
              <button class="btn btn-secondary" id="e-catalog-add">➕ 加入清单</button>
              <button class="btn btn-primary" id="e-manual-add">✏️ 手动新增</button>
            </div>
            <div class="section-title">📦 备件库存状态</div>
            <div style="background:#fafbfc;padding:8px 12px;border-radius:6px;font-size:12px;color:#606266;margin-bottom:10px">
              <span class="inventory-badge in-stock">库存充足（>20）</span>
              <span class="inventory-badge low-stock">库存不足（≤20）</span>
              <span class="inventory-badge out-stock">缺货（请确认采购周期）</span>
            </div>
            <table class="data-table">
              <thead><tr>
                <th style="width:90px">编码</th><th>名称</th><th style="width:70px">单位</th>
                <th style="width:100px">单价</th><th style="width:80px">数量</th>
                <th style="width:100px">小计</th><th style="width:70px">操作</th>
              </tr></thead>
              <tbody id="e-mats-body">${matRows}</tbody>
            </table>
          </div>

          <div data-panel="labor" style="display:none">
            <div style="margin-bottom:10px">
              <button class="btn btn-primary" id="e-add-labor">➕ 添加工时项</button>
              <span style="color:#909399;font-size:12px;margin-left:8px">可自定义工时名称、单价和数量（如 项/次/小时）</span>
            </div>
            <table class="data-table">
              <thead><tr>
                <th>工时项目</th><th style="width:90px">单位</th>
                <th style="width:110px">单价</th><th style="width:90px">数量</th>
                <th style="width:100px">小计</th><th style="width:70px">操作</th>
              </tr></thead>
              <tbody id="e-labs-body">${labRows}</tbody>
            </table>
          </div>

          <div data-panel="extra" style="display:none">
            <div class="form-row">
              <label>上门费（元）</label>
              <input class="e-vis" type="number" min="0" step="5" value="${vis}" placeholder="如：60、80、100" style="width:200px" />
              <div style="font-size:12px;color:#909399;margin-top:4px">一般按距离和交通成本收取，3 公里内 50~80 元常见</div>
            </div>
            <div class="divider"></div>
            <div class="section-title">🛡️ 保修承诺</div>
            <div class="form-grid">
              <div class="form-row">
                <label>保修时长（月）</label>
                <input class="e-war-months" type="number" min="0" step="1" value="${war.months || 0}" style="width:160px" />
              </div>
              <div class="form-row">
                <label>常见快捷选择</label>
                <div>
                  <button type="button" class="btn btn-secondary btn-sm e-war-preset" data-m="1" data-s="管道疏通等简单作业，相同位置再次堵塞保修 1 个月">疏通类 1 个月</button>
                  <button type="button" class="btn btn-secondary btn-sm e-war-preset" data-m="3" data-s="常规维修工艺（非人为损坏）保修 3 个月">常规 3 个月</button>
                  <button type="button" class="btn btn-secondary btn-sm e-war-preset" data-m="6" data-s="标准工艺保修 6 个月，含免费上门复查">标准 6 个月</button>
                  <button type="button" class="btn btn-secondary btn-sm e-war-preset" data-m="12" data-s="防水/隐蔽工程类工艺保修 12 个月">防水 12 个月</button>
                </div>
              </div>
            </div>
            <div class="form-row">
              <label>保修范围说明</label>
              <textarea class="e-war-scope" rows="2" placeholder="如：防水涂层工艺 12 个月，非人为损坏/非再次积尘导致的故障...">${war.scope || ''}</textarea>
            </div>
          </div>

          <div data-panel="summary" style="display:none">
            ${UI.pricingBreakdown({ pricing, estimateUpper: order.estimateUpper, customerBudget: order.customerBudget, addItems: order.addItems })}
            ${over ? `
              <div class="divider"></div>
              <div class="form-row">
                <label><span class="req">*</span>超预估原因（必须填写，不少于 10 个字）</label>
                <textarea class="e-over" rows="3" placeholder="请详细说明超出预估上限的原因，如：客户要求增加深度清洗服务 + 支架更换，原方案未含此部分...">${overReason}</textarea>
              </div>
              <div style="background:#fffbe6;border:1px solid #ffe58f;padding:10px 14px;border-radius:6px;font-size:12px;color:#ad4e00">
                💡 提交后，系统将自动进入「超预估复核」流程，推送给财务（赵会计）审批，复核通过后才会到客户确认环节。
              </div>
            ` : ''}
          </div>

          <div style="position:sticky;bottom:-20px;padding:12px 0;margin-top:12px;background:linear-gradient(transparent,#fff 20%);font-size:12px;color:#606266">
            <b>当前操作员：</b>${me.name} · ${new Date().toLocaleString('zh-CN')}
          </div>
        `; };

        const footer = `
          <button class="btn btn-secondary" data-close>取消</button>
          <button class="btn btn-primary" id="e-submit">💾 提交报价（按规则流转）</button>
        `;

        const m = UI.openModal({ title: '✏️ 勘查与报价编辑 · ' + order.title, body: bodyHtml(), footer, width: 960, className: 'modal-lg' });
        window.__editQuoteMats = (order.materials || []).slice();
        window.__editQuoteLabs = (order.labor || []).slice();
        window.__editQuoteVis = order.visitFee || 0;
        window.__editQuoteWar = Object.assign({ months: 6, scope: '' }, order.warranty || {});
        window.__editQuoteSurv = Object.assign({ diagnosis: '', areaSize: '', difficulty: '中等' }, order.survey || {});
        window.__editQuoteOverReason = order.overEstimateReason || '';

        const refreshBody = () => { m.body.innerHTML = bodyHtml(); bindBody(); bindTab(); };

        function bindTab() {
          m.el.querySelectorAll('#e-tabs .tab').forEach(t => {
            t.onclick = () => {
              saveInputState();
              m.el.querySelectorAll('#e-tabs .tab').forEach(x => x.classList.remove('active'));
              t.classList.add('active');
              const key = t.getAttribute('data-tab');
              m.el.querySelectorAll('[data-panel]').forEach(p => {
                p.style.display = (p.getAttribute('data-panel') === key) ? '' : 'none';
              });
              bindBody();
            };
          });
        }

        function saveInputState() {
          const body = m.body;
          const mats = [];
          body.querySelectorAll('#e-mats-body tr[data-i]').forEach(tr => {
            mats.push({
              code: tr.querySelector('.e-code').value.trim(),
              name: tr.querySelector('.e-name').value.trim(),
              unit: tr.querySelector('.e-unit').value.trim(),
              price: Number(tr.querySelector('.e-price').value || 0),
              qty: Number(tr.querySelector('.e-qty').value || 0)
            });
          });
          window.__editQuoteMats = mats.filter(m => m.name && m.qty > 0);

          const labs = [];
          body.querySelectorAll('#e-labs-body tr[data-i]').forEach(tr => {
            labs.push({
              item: tr.querySelector('.e-litem').value.trim(),
              unit: tr.querySelector('.e-lunit').value.trim() || '项',
              price: Number(tr.querySelector('.e-lprice').value || 0),
              qty: Number(tr.querySelector('.e-lqty').value || 0)
            });
          });
          window.__editQuoteLabs = labs.filter(l => l.item && l.qty > 0);

          const visEl = body.querySelector('.e-vis');
          if (visEl) window.__editQuoteVis = Number(visEl.value || 0);

          const diag = body.querySelector('.e-diagnosis');
          if (diag) window.__editQuoteSurv.diagnosis = diag.value;
          const area = body.querySelector('.e-area');
          if (area) window.__editQuoteSurv.areaSize = area.value;
          const diff = body.querySelector('.e-diff');
          if (diff) window.__editQuoteSurv.difficulty = diff.value;

          const wm = body.querySelector('.e-war-months');
          if (wm) window.__editQuoteWar.months = Number(wm.value || 0);
          const ws = body.querySelector('.e-war-scope');
          if (ws) window.__editQuoteWar.scope = ws.value;

          const ov = body.querySelector('.e-over');
          if (ov) window.__editQuoteOverReason = ov.value;
        }

        function bindBody() {
          const body = m.body;

          const catSel = body.querySelector('#e-catalog');
          const catBtn = body.querySelector('#e-catalog-add');
          if (catBtn) catBtn.onclick = () => {
            saveInputState();
            const opt = catSel.options[catSel.selectedIndex];
            if (!opt || !opt.value) { UI.toast('请先选择备件', 'warning'); return; }
            const qty = Number(body.querySelector('#e-stock-qty').value || 1);
            window.__editQuoteMats.push({
              code: opt.value,
              name: opt.getAttribute('data-name'),
              unit: opt.getAttribute('data-unit'),
              price: Number(opt.getAttribute('data-price') || 0),
              qty
            });
            refreshBody();
            m.el.querySelector('#e-tabs .tab[data-tab="materials"]').click();
          };
          const manBtn = body.querySelector('#e-manual-add');
          if (manBtn) manBtn.onclick = () => {
            saveInputState();
            window.__editQuoteMats.push({ code: 'M' + Date.now().toString().slice(-5), name: '', unit: '件', price: 0, qty: 1 });
            refreshBody();
            m.el.querySelector('#e-tabs .tab[data-tab="materials"]').click();
          };

          body.querySelectorAll('#e-mats-body .e-mdel').forEach(btn => {
            btn.onclick = () => {
              saveInputState();
              const i = Number(btn.closest('tr').getAttribute('data-i'));
              window.__editQuoteMats.splice(i, 1);
              refreshBody();
              m.el.querySelector('#e-tabs .tab[data-tab="materials"]').click();
            };
          });

          const addL = body.querySelector('#e-add-labor');
          if (addL) addL.onclick = () => {
            saveInputState();
            window.__editQuoteLabs.push({ item: '', unit: '项', price: 0, qty: 1 });
            refreshBody();
            m.el.querySelector('#e-tabs .tab[data-tab="labor"]').click();
          };
          body.querySelectorAll('#e-labs-body .e-ldel').forEach(btn => {
            btn.onclick = () => {
              saveInputState();
              const i = Number(btn.closest('tr').getAttribute('data-i'));
              window.__editQuoteLabs.splice(i, 1);
              refreshBody();
              m.el.querySelector('#e-tabs .tab[data-tab="labor"]').click();
            };
          });

          body.querySelectorAll('.e-war-preset').forEach(b => {
            b.onclick = () => {
              saveInputState();
              window.__editQuoteWar.months = Number(b.getAttribute('data-m'));
              window.__editQuoteWar.scope = b.getAttribute('data-s');
              refreshBody();
              m.el.querySelector('#e-tabs .tab[data-tab="extra"]').click();
            };
          });

          ['input','change'].forEach(ev => {
            body.querySelectorAll('.e-price,.e-qty,.e-lprice,.e-lqty,.e-vis').forEach(el => {
              el.addEventListener(ev, () => { saveInputState();
                const tab = body.querySelector('#e-tabs .tab.active');
                if (tab && tab.getAttribute('data-tab') === 'summary') {
                  m.body.innerHTML = bodyHtml(); bindBody(); bindTab();
                  m.el.querySelector('#e-tabs .tab[data-tab="summary"]').click();
                }
              });
            });
          });

          body.querySelectorAll('[data-close]').forEach(b => b.onclick = () => m.close());
        }

        bindTab();
        bindBody();

        m.el.querySelector('#e-submit').onclick = () => {
          saveInputState();
          runSafely(() => {
            const surv = window.__editQuoteSurv;
            if (!surv.diagnosis || surv.diagnosis.trim().length < 5) {
              UI.toast('故障诊断至少 5 个字', 'warning');
              m.el.querySelector('#e-tabs .tab[data-tab="survey"]').click();
              return;
            }
            State.submitQuote(orderId, {
              materials: window.__editQuoteMats,
              labor: window.__editQuoteLabs,
              visitFee: window.__editQuoteVis,
              warranty: window.__editQuoteWar,
              survey: surv,
              overEstimateReason: window.__editQuoteOverReason
            });
            UI.toast('报价已提交，按规则自动流转', 'success');
            m.close();
            App.router.refresh();
          });
        };
      });
    },

    changeOrderModal(orderId) {
      runSafely(() => {
        const order = Store.getOrder(orderId);
        if (!order.priceLocked) throw new Error('仅开工锁价后工单可走变更单');
        if (!['working','change'].includes(order.status)) throw new Error('当前状态不可提交变更');

        const me = Store.currentRole();
        window.__changeItems = [{ name: '', amount: '', reason: '' }];

        const renderBody = () => {
          const items = window.__changeItems;
          const rows = items.map((it, i) => `
            <tr data-i="${i}">
              <td><input class="c-name" value="${it.name}" placeholder="如：主管拆口检查与复原" style="width:100%;padding:6px 8px;border:1px solid #dcdfe6;border-radius:4px" /></td>
              <td><input class="c-amount" type="number" step="1" value="${it.amount}" placeholder="元" style="width:120px;padding:6px 8px;border:1px solid #dcdfe6;border-radius:4px" /></td>
              <td><input class="c-reason" value="${it.reason}" placeholder="不少于5字" style="width:100%;padding:6px 8px;border:1px solid #dcdfe6;border-radius:4px" /></td>
              <td><button class="btn btn-danger btn-sm c-del" ${items.length === 1 ? 'disabled' : ''}>删除</button></td>
            </tr>`).join('');
          const total = items.reduce((s, x) => s + (Number(x.amount) || 0), 0);
          return `
            <div class="status-banner locked">🔒 原始报价已锁价（${Util.fmtMoney(order.pricing.total)}），以下变更将生成变更单，需客户确认后方可生效。</div>
            <div style="margin-bottom:10px">
              <button class="btn btn-secondary" id="c-add-item">➕ 新增变更项</button>
              <span style="color:#909399;font-size:12px;margin-left:8px">每项变更必须说明原因</span>
            </div>
            <table class="data-table">
              <thead><tr>
                <th>变更项目</th><th style="width:140px">追加金额（元）</th>
                <th>变更原因（≥5字）</th><th style="width:80px">操作</th>
              </tr></thead>
              <tbody id="c-body">${rows}</tbody>
            </table>
            <div style="margin-top:14px;padding:12px 16px;background:#fff7e6;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
              <div><b style="color:#ad4e00">本次变更合计追加：</b></div>
              <div style="font-size:22px;font-weight:700;color:#fa8c16">+ ${Util.fmtMoney(total)}</div>
            </div>
            <div style="margin-top:12px;padding:10px 14px;background:#f6ffed;border-radius:6px;font-size:12px;color:#237804">
              ✅ 提交后，工单进入「变更审批中」状态，客户确认后将自动加总到报价总额并继续施工。
            </div>
          `;
        };

        const footer = `
          <button class="btn btn-secondary" data-close>取消</button>
          <button class="btn btn-warning" id="c-submit">📋 提交变更申请</button>
        `;
        const m = UI.openModal({ title: '📋 施工变更单 · ' + order.id, body: renderBody(), footer, width: 880 });

        const bind = () => {
          m.body.querySelector('#c-add-item').onclick = () => {
            saveState();
            window.__changeItems.push({ name: '', amount: '', reason: '' });
            m.body.innerHTML = renderBody(); bind();
          };
          m.body.querySelectorAll('.c-del').forEach(b => {
            b.onclick = () => {
              saveState();
              const i = Number(b.closest('tr').getAttribute('data-i'));
              if (window.__changeItems.length > 1) {
                window.__changeItems.splice(i, 1);
                m.body.innerHTML = renderBody(); bind();
              }
            };
          });
          m.body.querySelectorAll('.c-name,.c-amount,.c-reason').forEach(el => {
            el.oninput = () => saveState();
          });
          m.body.querySelectorAll('[data-close]').forEach(b => b.onclick = () => m.close());
        };
        function saveState() {
          const arr = [];
          m.body.querySelectorAll('#c-body tr[data-i]').forEach(tr => {
            arr.push({
              name: tr.querySelector('.c-name').value.trim(),
              amount: Number(tr.querySelector('.c-amount').value || 0),
              reason: tr.querySelector('.c-reason').value.trim()
            });
          });
          window.__changeItems = arr;
        }
        bind();

        m.el.querySelector('#c-submit').onclick = () => {
          saveState();
          runSafely(() => {
            State.submitChange(orderId, { items: window.__changeItems.slice() });
            UI.toast('变更单已提交，等待客户确认', 'success');
            m.close();
            App.router.refresh();
          });
        };
      });
    }
  };

  function ServicePanel_orderListView(orders) {
    return ServicePanel.orderListView(orders, true);
  }

  global.TechPanel = TechPanel;
})(window);

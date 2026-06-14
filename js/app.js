/* global window, Store, Util, State, UI, ServicePanel, TechPanel, ClientPanel, ReviewerPanel */
(function (global) {

  function runSafely(fn) {
    try { fn(); }
    catch (e) { UI.toast(e.isBiz ? e.message : ('错误：' + e.message), 'error', 4000); console.error(e); }
  }

  const NAV = {
    service: [
      { key: 'dashboard',  title: '🏠 工作台概览', badge: null,         panel: function () { return ServicePanel.dashboard(); } },
      { key: 'draft',      title: '📝 待派单',       badge: function () { return Store.orders(function(o){return o.status==='draft';}).length; }, panel: function () { return ServicePanel.listDraft(); } },
      { key: 'active',     title: '⚙️ 处理中',       badge: function () {
          var n = Store.orders(function(o){return ['assigned','surveying','priced','review','pending','returned','confirmed'].includes(o.status);}).length;
          return n || null;
        }, panel: function () { return ServicePanel.listActive(); } },
      { key: 'working',    title: '🛠️ 施工/验收',    badge: function () {
          var n = Store.orders(function(o){return ['working','change','checking','rework'].includes(o.status);}).length;
          return n || null;
        }, panel: function () { return ServicePanel.listWorking(); } },
      { key: 'done',       title: '✅ 已归档',       badge: null,         panel: function () { return ServicePanel.listDone(); } },
      { key: 'all',        title: '📂 全部工单',     badge: null,         panel: function () { return ServicePanel.listAll(); } }
    ],
    tech: [
      { key: 'dashboard', title: '🏠 师傅工作台',  badge: null, panel: function () { return TechPanel.dashboard(); } },
      { key: 'todo',      title: '🚗 待勘查上门',   badge: function () {
          var me = Store.currentRole();
          var n = Store.orders(function(o){return o.techUserId===me.id && ['assigned','surveying'].includes(o.status);}).length;
          return n || null;
        }, panel: function () { return TechPanel.listTodo(); } },
      { key: 'pricing',   title: '💰 报价管理',    badge: function () {
          var me = Store.currentRole();
          var n = Store.orders(function(o){return o.techUserId===me.id && ['priced','returned','review','pending'].includes(o.status);}).length;
          return n || null;
        }, panel: function () { return TechPanel.listPricing(); } },
      { key: 'working',   title: '🛠️ 施工管理',    badge: function () {
          var me = Store.currentRole();
          var n = Store.orders(function(o){return o.techUserId===me.id && ['confirmed','working','change','checking','rework'].includes(o.status);}).length;
          return n || null;
        }, panel: function () { return TechPanel.listWorking(); } },
      { key: 'done',      title: '✅ 已完工',      badge: null, panel: function () { return TechPanel.listDone(); } }
    ],
    client: [
      { key: 'dashboard',     title: '🏠 我的工作台', badge: null, panel: function () { return ClientPanel.dashboard(); } },
      { key: 'pendingQuote',  title: '🤝 待确认报价',  badge: function () {
          var me = Store.currentRole();
          var n = Store.orders(function(o){return o.clientId===me.id && ['pending','review'].includes(o.status);}).length;
          return n || null;
        }, panel: function () { return ClientPanel.listPendingQuote(); } },
      { key: 'pendingChange', title: '📋 待确认变更',  badge: function () {
          var me = Store.currentRole();
          var n = Store.orders(function(o){return o.clientId===me.id && o.status==='change'
            && (o.changeOrders||[]).some(function(c){return c.status==='pending';});}).length;
          return n || null;
        }, panel: function () { return ClientPanel.listPendingChange(); } },
      { key: 'pendingAccept', title: '🔍 待验收',      badge: function () {
          var me = Store.currentRole();
          var n = Store.orders(function(o){return o.clientId===me.id && o.status==='checking';}).length;
          return n || null;
        }, panel: function () { return ClientPanel.listPendingAccept(); } },
      { key: 'history',       title: '📂 历史工单',    badge: null, panel: function () { return ClientPanel.listHistory(); } }
    ],
    reviewer: [
      { key: 'dashboard', title: '🏠 财务工作台', badge: null, panel: function () { return ReviewerPanel.dashboard(); } },
      { key: 'review',    title: '⚠️ 超预估复核',  badge: function () {
          var n = Store.orders(function(o){return o.status==='review';}).length;
          return n || null;
        }, panel: function () { return ReviewerPanel.listReview(); } },
      { key: 'finance',   title: '💰 收票/收款',   badge: null, panel: function () { return ReviewerPanel.listFinance(); } },
      { key: 'all',       title: '📂 全部工单',    badge: null, panel: function () { return ReviewerPanel.listAll(); } }
    ]
  };

  NAV.tech2 = NAV.tech;

  const ROLE_PANEL = {
    service:  ServicePanel,
    tech:     TechPanel,
    tech2:    TechPanel,
    client:   ClientPanel,
    client2:  ClientPanel,
    reviewer: ReviewerPanel
  };

  const App = {
    currentRoute: { role: null, page: null, orderId: null },
    stack: [],

    _apply(route, fromBack, noStack) {
      App.currentRoute = Object.assign({ role: Store.currentRole().id, page: 'dashboard' }, route);
      Store.setRole(App.currentRoute.role);
      App.render();
    },

    router: {
      go(route) {
        App.stack.push(Object.assign({}, App.currentRoute));
        App._apply(route);
      },
      replace(route) {
        App._apply(route);
      },
      back() {
        if (App.stack.length) {
          var prev = App.stack.pop();
          App._apply(prev, true);
        }
      },
      refresh() {
        App._apply(App.currentRoute, false, true);
      }
    },

    openOrder(orderId, forceRole) {
      var role = forceRole || Store.currentRole().id;
      App.router.go({ role: role, page: 'order', orderId: orderId });
    },

    sendMessage(orderId) {
      UI.prompt('发送沟通消息', {
        label: '请输入沟通内容（将写入工单时间线）',
        multiline: true, rows: 3, required: true,
        placeholder: '请输入您要沟通的内容...'
      }).then(function (content) {
        if (content === null) return;
        runSafely(function () {
          State.addMessage(orderId, content);
          UI.toast('消息已发送', 'success');
          App.router.refresh();
        });
      });
    },

    render() {
      var role = Store.currentRole();
      var roleId = role.id;
      var nav = NAV[roleId] || [];
      var pageKey = App.currentRoute.page || 'dashboard';
      var orderId = App.currentRoute.orderId;

      document.getElementById('currentUserLabel').textContent = role.name + ' · ' + role.title;
      document.getElementById('roleSelect').value = roleId;

      var navList = document.getElementById('navList');
      navList.innerHTML = nav.map(function (n) {
        var badge = '';
        if (n.badge) {
          try { var b = typeof n.badge === 'function' ? n.badge() : n.badge; if (b) badge = '<span class="badge">' + b + '</span>'; } catch(_) {}
        }
        var active = (pageKey === n.key && !orderId) ? 'active' : '';
        return `<li class="${active}" data-key="${n.key}"><span>${n.title}</span>${badge}</li>`;
      }).join('');

      navList.querySelectorAll('li').forEach(function (li) {
        li.onclick = function () {
          var key = li.getAttribute('data-key');
          App.router.replace({ role: roleId, page: key });
        };
      });

      var contentArea = document.getElementById('contentArea');
      try {
        if (orderId) {
          var panel = ROLE_PANEL[roleId] || ServicePanel;
          contentArea.innerHTML = panel.orderDetail(orderId);
          App._bindScrollTop();
          return;
        }
        var navItem = nav.find(function (n) { return n.key === pageKey; });
        if (!navItem) navItem = nav[0];
        contentArea.innerHTML = navItem ? navItem.panel() : UI.emptyState('页面不存在');
      } catch (e) {
        contentArea.innerHTML = `<div class="card">
          <div class="card-title" style="color:#f5222d">❌ 渲染错误</div>
          <pre style="background:#fff1f0;padding:12px;border-radius:6px;color:#a8071a;white-space:pre-wrap;overflow:auto">${e.stack || e.message}</pre>
        </div>`;
        console.error(e);
      }
      App._bindScrollTop();
    },

    _bindScrollTop() {
      document.querySelector('.main-content').scrollTop = 0;
    },

    bindGlobal() {
      document.getElementById('roleSelect').onchange = function (e) {
        var id = e.target.value;
        App.router.replace({ role: id, page: 'dashboard', orderId: null });
        UI.toast('已切换到 ' + (Store.users()[id] || {}).name, 'info', 1800);
      };
      document.getElementById('resetDataBtn').onclick = async function () {
        var ok = await UI.confirm('重置演示数据？',
          '<div>将清空所有操作并恢复为初始 5 条演示工单数据，确定继续？</div>',
          '✅ 确认重置', '取消', true);
        if (!ok) return;
        Store.reset();
        App.router.replace({ role: Store.currentRole().id, page: 'dashboard' });
        UI.toast('✅ 演示数据已重置', 'success', 2200);
      };
    },

    init() {
      Store.load();
      this.bindGlobal();
      this.router.replace({ role: Store.currentRole().id, page: 'dashboard' });
      setTimeout(function () {
        UI.toast('💡 提示：通过右上角「角色切换」可模拟多人派单协作', 'info', 4200);
      }, 600);
    }
  };

  global.App = App;

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})(window);

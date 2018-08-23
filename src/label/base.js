const Util = require('../util');
const DomUtil = Util.DomUtil;
const Component = require('../component');

class Label extends Component {
  getDefaultCfg() {
    const cfg = super.getDefaultCfg();
    return Object.assign({}, cfg, {
      name: 'label',
      /**
       * label类型
       * @type {(String)}
       */
      type: 'default',
      /**
       * 显示的文本集合
       * @type {Array}
       */
      items: null,
      /**
       * 文本样式
       * @type {(Object|Function)}
       */
      textStyle: null,
      /**
       * 文本显示格式化回调函数
       * @type {Function}
       */
      formatter: null,
      /**
       * 使用 html 渲染文本
       * @type {(String|Function)}
       */
      htmlTemplate: null,
      /**
       * html 渲染时用的容器的模板，必须存在 class = "g-labels"
       * @type {String}
       */
      _containerTpl: '<div class="g-labels" style="position:absolute;top:0;left:0;"></div>',
      /**
       * html 渲染时单个 label 的模板，必须存在 class = "g-label"，如果 htmlTemplate 为字符串，则使用 htmlTemplate
       * @type {String}
       */
      _itemTpl: '<div class="g-label" style="position:absolute;">{text}</div>',
      /**
       * label牵引线
       * @type {Object|Boolean}
       */
      labelLine: false
    });
  }
  clear() {
    const group = this.get('group');
    const container = this.get('container');
    if (group) {
      group.clear();
    }
    if (container) {
      container.innerHTML = '';
    }
    super.clear();
  }
  render() {
    this.clear();
    this._init();
    this.beforeDraw();
    this.draw();
    this.afterDraw();
  }
  draw() {
    const self = this;
    const items = self.get('items');
    const labels = Util.each(items, function(item, index) {
      self._addLabel(item, index);
    });
    this._adjustLabels(labels);
    if (labels.labelLine) {
      self.drawLines();
    }
    this.get('canvas').draw();
  }
  show() {
    const group = this.get('group');
    const container = this.get('container');
    if (group) {
      group.show();
    }
    if (container) {
      container.style.opacity = 1;
    }
  }
  hide() {
    const group = this.get('group');
    const container = this.get('container');
    if (group) {
      group.hide();
    }
    if (container) {
      container.style.opacity = 0;
    }
  }
  drawLines() {
    const self = this;
    Util.each(self.get('items'), label => {
      self.lineToLabel(label);
    });
  }
  lineToLabel(label) {
    const self = this;
    const lineStyle = self.get('labelLine');
    if (!lineStyle.path) {
      const start = label._originPoints;
      lineStyle.path = [
        [ 'M', start.x, start.y ],
        [ 'L', label.x, label.y ]
      ];
    }
    let lineGroup = self.get('lineGroup');
    if (!lineGroup) {
      lineGroup = self.get('group').addGroup({
        elCls: 'x-line-group'
      });
      self.set('lineGroup', lineGroup);
    }
    const lineShape = lineGroup.addShape('path', {
      attrs: Util.mix({
        fill: null,
        stroke: label.color
      }, lineStyle)
    });
    // label 对应线的动画关闭
    lineShape.name = 'labelLine';
    // generate labelLine id according to label id
    lineShape._id = label._id && label._id.replace('glabel', 'glabelline');
    lineShape.set('coord', self.get('coord'));
  }
  // TODO 区分label的type or 定成一个配置项用util方法？
  _adjustLabels() {}
  getLabels() {
    const container = this.get('container');
    if (container) {
      return Util.toArray(container.childNodes);
    }
    return this.get('group').get('children');
  }
  _addLabel(item, index) {
    const cfg = this._getLabelCfg(item, index);
    return this._createText(cfg);
  }
  _init() {
    if (this.get('htmlTemplate')) {
      let container = this.get('container');
      if (Util.isString(container)) {
        container = document.getElementById(container);
        if (container) {
          this.set('container', container);
        }
      }
      if (!container) {
        const containerTpl = this.get('_containerTpl');
        const wrapper = this.get('canvas').get('el').parentNode;
        container = DomUtil.createDom(containerTpl);
        wrapper.style.position = 'relative';
        wrapper.appendChild(container);
        this.set('container', container);
      }
    }
  }
  _getLabelCfg(item, index) {
    const self = this;
    let textStyle = self.get('textStyle') || {};
    const formatter = self.get('formatter');
    const htmlTemplate = self.get('htmlTemplate');

    if (!Util.isObject(item)) {
      const tmp = item;
      item = {};
      item.text = tmp;
    }

    if (Util.isFunction(textStyle)) {
      textStyle = textStyle(item.text, item, index);
    }

    if (formatter) {
      item.text = formatter(item.text, item, index);
    }

    if (Util.isFunction(htmlTemplate)) {
      item.text = htmlTemplate(item.text, item, index);
    }

    if (Util.isNil(item.text)) {
      item.text = '';
    }

    item.text += '';

    const cfg = Util.mix({}, item, textStyle, {
      x: item.x || 0,
      y: item.y || 0
    });
    return cfg;
  }
  _createText(cfg) {
    const htmlTemplate = this.get('htmlTemplate');
    const container = this.get('container');
    let labelShape;

    if (htmlTemplate) {
      const node = this._createDom(cfg);
      container.appendChild(node);
      this._setCustomPosition(cfg, node);
    } else {
      const origin = cfg.point;
      const group = this.get('group');
      delete cfg.point; // 临时解决，否则影响动画
      labelShape = group.addShape('text', {
        attrs: cfg
      });
      labelShape.setSilent('origin', origin);
      labelShape.name = 'label'; // 用于事件标注
      this.get('appendInfo') && labelShape.setSilent('appendInfo', this.get('appendInfo'));
      return labelShape;
    }
  }
  _createDom(cfg) {
    const itemTpl = this.get('_itemTpl');
    const htmlTemplate = this.get('htmlTemplate');

    if (Util.isString(htmlTemplate)) {
      cfg.text = Util.substitute(htmlTemplate, { text: cfg.text });
    }

    const str = Util.substitute(itemTpl, { text: cfg.text });

    return DomUtil.createDom(str);
  }
  _setCustomPosition(cfg, htmlDom) {
    const textAlign = cfg.textAlign || 'left';
    let top = cfg.y;
    let left = cfg.x;
    const width = DomUtil.getOuterWidth(htmlDom);
    const height = DomUtil.getOuterHeight(htmlDom);

    top = top - height / 2;
    if (textAlign === 'center') {
      left = left - width / 2;
    } else if (textAlign === 'right') {
      left = left - width;
    }

    htmlDom.style.top = parseInt(top, 10) + 'px';
    htmlDom.style.left = parseInt(left, 10) + 'px';
  }
}

module.exports = Label;

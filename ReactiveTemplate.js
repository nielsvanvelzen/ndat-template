import { ReactiveClass } from './ReactiveClass.js';

export class ReactiveTemplate extends ReactiveClass {
	constructor(el) {
		super();

		this._el = el;
		this._tpl = el.innerHTML;
		this._renderRequested = false;
		this._templateMap = new Map();
		this._forChilds = new Map();

		this.observe(prop => this.requestRender());
		this.requestRender()
	}

	requestRender() {
		if (this._renderRequested) return;
		this._renderRequested = true;

		window.requestAnimationFrame(() => this.render());
	}

	render() {
		if (this._el.dataset.compiled !== 'true') {
			this._el.innerHTML = this._tpl;
			this._el.dataset.compiled = 'true';
			this._el.normalize();
		}

		this.renderElement(this._el, this);

		this._renderRequested = false;
	}

	renderElement(node, context) {
		if (node.dataset && node.dataset.skip === 'true') return;
		
		if (node.nodeType === 3) {
			this.renderText(node, context);
		} else if (node.nodeType === 1) {
			for (let i = node.attributes.length - 1; i >= 0; i--)
				this.renderAttribute(node.attributes[i], node, context);
		}

		if (node.dataset && node.dataset.skip === 'true') return;
		if (node.dataset && node.dataset.skipChilds === 'true') return;

		for (let child of node.childNodes) this.renderElement(child, context);
	}

	renderText(node, context) {
		if (node.nodeValue.trim().length > 0 && node.parentNode.childNodes.length > 1) {
			let span = document.createElement('span');
			span.textContent = node.nodeValue;
			span.style.display = 'contents';
			node.parentNode.replaceChild(span, node);
			this.renderElement(span, context);
		} else {
			if (!this._templateMap.has(node)) this._templateMap.set(node, node.nodeValue);
			
			let text = this._templateMap.get(node).replace(/{{([\w\W]+?)}}/g, (match, prop) => this.execFunction(this, prop, context));
			if (node.nodeValue !== text) node.nodeValue = text;
		}
	}

	renderAttribute(attr, node, context) {
		if (attr.name.startsWith('@')) {
			node.addEventListener(attr.name.substr(1), () => this.execFunction(node, attr.value, context));

			node.attributes.removeNamedItem(attr.name);
		} else if (attr.name.startsWith(':')) {
			let name = attr.name.substr(1);
			let value = this.execFunction(node, attr.value, context);

			if(['value', 'checked'].includes(name)) node[name] = value;
			else node.setAttribute(name, value);
		} else if (attr.name === 'v-for') {
			if (!this._templateMap.has(node)) this._templateMap.set(node, node.cloneNode(true));
			let tpl = this._templateMap.get(node);

			let [, left, operator, expression] = attr.value.match(/(.+?)\s*(in|of)\s*(.+)/);
			expression = this.execFunction(node, expression, context);

			if (this._forChilds.has(node))
				for (let child of this._forChilds.get(node)) child.parentNode.removeChild(child);
			
			this._forChilds.set(node, []);

			let index = 0;
			for (let item of expression) {
				let keyExpression = tpl.getAttribute(':key') || null;
				keyExpression = this.execFunction(node, keyExpression, {...context, [left]: item, index});

				let child = node.parentNode.querySelector('[key="' + keyExpression + '"]');

				if (!child) {
					child = tpl.cloneNode(true);
					child.attributes.removeNamedItem(attr.name);
					node.parentNode.insertBefore(child, node);
					this._forChilds.get(node).push(child);
				}

				
				child.dataset.skip = 'false';
				this.renderElement(child, { ...context, [left]: item, index });
				child.dataset.skip = 'true';

				index++;
			}

			node.dataset.skipChilds = 'true';
			node.hidden = true;
		}
	}

	execFunction(self, value, context) {
		try {
			let code = [];
			let tmpVarName = 'templateDataCollection';
			code.push(`let {${Object.keys(context).join(',')}} = ${tmpVarName};`);
			code.push('/*-*/');
			code.push(`const execFunctionResult = ${new Function('return ' + value).toString()}.call(this);`);
			code.push('/*-*/');
			code.push(`return {execFunctionResult, vars: {${Object.keys(context).join(',')}}}`);

			let func = new Function(tmpVarName, code.join('\r\n'));
			let result = func.call(self, context);
		
			for (let entry of Object.entries(result.vars)) context[entry[0]] = entry[1];
			return result.execFunctionResult;
		} catch (err) {
			console.log({ self, value, context });
			console.error(err);
			return;
		}
	}

	encodeHTML(html) {
		let el = document.createElement('div');
		el.textContent = html;
		return el.innerHTML;
	}
}
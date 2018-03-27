import { ReactiveClass } from './ReactiveClass.js';

export class ReactiveTemplate extends ReactiveClass {
	constructor(el) {
		super();

		this._el = el;
		this._tpl = el.innerHTML;
		this._filters = {};
		this._changes = [];
		this._renderRequested = false;
		this._templateMap = new Map();

		this.observe(prop => {
			this._changes.push(prop);
			this.requestRender()
		});
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
			this._el.dataset.compiled = true;
			this._el.normalize();
		}

		this.renderElement(this._el);

		this._changes = [];
		this._renderRequested = false;
	}

	renderElement(node) {
		for (let child of node.childNodes) this.renderElement(child);	

		if (node.nodeType === 3) {
			if (node.nodeValue.trim().length > 0 && node.parentNode.childNodes.length > 1) {
				let span = document.createElement('span');
				span.textContent = node.nodeValue;
				span.style.display = 'contents';
				node.parentNode.replaceChild(span, node);
				this.renderElement(span);
				return;
			}

			let element = node.parentElement;

			if (!this._templateMap.has(node))
				this._templateMap.set(node, node.nodeValue);
			
			let text = this._templateMap.get(node).replace(/{{([ _a-zA-Z0-9\|]*)}}/g, (match, prop) => this.parseProp(prop));
			
			if (text.length === 0) text = ' ';
			
			if (node.nodeValue !== text)
				node.nodeValue = text;
		} else if (node.nodeType === 1)
			for (let attr of node.attributes)
				this.renderAttribute(attr, node);
	}

	execFunction(self, value) {
		console.log('exec');

		let code = [];
		let tmpVarName = 'templateDataCollection';
		code.push(`let {${Object.keys(this).join(',')}} = ${tmpVarName};`);
		code.push('/*-*/');
		code.push('const execFunctionResult = ' + new Function('return ' + value).toString() + '.call(this);');
		code.push('/*-*/');
		code.push(`return {execFunctionResult, vars: {${Object.keys(this).join(',')}}}`);

		let func = new Function(tmpVarName, code.join('\r\n'));
		console.debug(func);
		let result = func.call(self, this);
		
		for (let entry of Object.entries(result.vars)) this[entry[0]] = entry[1];
		return result.execFunctionResult;
	}

	renderAttribute(attr, node) {
		if (attr.name.startsWith('@')) {
			node.addEventListener(attr.name.substr(1), () => this.execFunction(node, attr.value));

			node.attributes.removeNamedItem(attr.name);
		} else if (attr.name.startsWith(':')) {
			console.log(attr);
			let name = attr.name.substr(1);
			let value = this.execFunction(node, attr.value);

			if(['value', 'checked'].includes(name))
				node[name] = value;
			else
				node.setAttribute(name, value);
		}
	}

	parseProp(raw) {
		let prop = raw;
		let filters = [];

		if (raw.includes('|')) [prop, ...filters] = raw.split('|').map(p => p.trim());

		let value = prop;
		value = this[prop.trim()];

		for (let filter of filters)
			if (filter in this._filters) value = this._filters[filter](value);

		return this.encodeHTML(value);
	}

	encodeHTML(html) {
		let el = document.createElement('div');
		el.textContent = html;
		return el.innerHTML;
	}

	filter(name, func) {
		this._filters[name] = func;
	}
}
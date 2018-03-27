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
		} else if (node.nodeType === 1) {
			for (let attr of [...node.attributes].filter(attr => attr.name.startsWith('@'))) {
				node.addEventListener(attr.name.substr(1), () => {
					let code = [];
					let tmpVarName = 'templateDataCollection';
					code.push(`let {${Object.keys(this).join(',')}} = ${tmpVarName};`);
					code.push('/* START EVENT HANDLER */');
					code.push(attr.value);
					code.push('/* END EVENT HANDLER */');
					code.push(`return {${Object.keys(this).join(',')}}`);

					let result = new Function(tmpVarName, code.join('\r\n')).call(node, this);
				
					for (let entry of Object.entries(result)) this[entry[0]] = entry[1];
				});

				node.attributes.removeNamedItem(attr.name);
			}
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
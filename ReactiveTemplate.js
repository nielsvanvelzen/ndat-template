import { ReactiveClass } from './ReactiveClass.js';

export class ReactiveTemplate extends ReactiveClass {
	constructor(el) {
		super();

		this._el = el;
		this._tpl = el.innerHTML;
		this._filters = {};
		this._changes = [];
		this._renderRequested = false;

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
		this._el.innerHTML = this._tpl;
		for (let el of [this._el, ...this._el.querySelectorAll('*')])
			this.renderElement(el);

		this._changes = [];
		this._renderRequested = false;
	}

	renderElement(el) {
		console.log(el);
		el.innerHTML = el.innerHTML.replace(/{{([ _a-zA-Z0-9\|]*)}}/g, (match, prop) => this.parseProp(prop));

		for (let attr of el.attributes) if (attr.name.startsWith('@')) {
			el.addEventListener(attr.name.substr(1), () => {
				let code = [];
				let tmpVarName = 'templateDataCollection';
				code.push(`let {${Object.keys(this).join(',')}} = ${tmpVarName};`);
				code.push('/* START EVENT HANDLER */');
				code.push(attr.value);
				code.push('/* END EVENT HANDLER */');
				code.push(`return {${Object.keys(this).join(',')}}`);

				let result = new Function(tmpVarName, code.join('\r\n')).call(el, this);
				
				for (let entry of Object.entries(result)) this[entry[0]] = entry[1];
			});
			el.attributes.removeNamedItem(attr.name);
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
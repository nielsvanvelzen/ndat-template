const ReactiveSymbols = {
	get: Symbol(),
	set: Symbol(),
	deleteProperty: Symbol(),
	createProxy: Symbol()
};

export class ReactiveClass {
	constructor() {
		this._observers = [];

		return this[ReactiveSymbols.createProxy](this);
	}

	[ReactiveSymbols.createProxy](obj) {
		return new Proxy(obj, {
			get: (...args) => this[ReactiveSymbols.get](...args),
			set: (...args) => this[ReactiveSymbols.set](...args),
			deleteProperty: (...args) => this[ReactiveSymbols.deleteProperty](...args)
		});
	}

	[ReactiveSymbols.get](obj, prop) {
		return obj[prop];
	}

	[ReactiveSymbols.set](obj, prop, val) {
		if (val === obj[prop]) return true;

		if (Array.isArray(val)) val = this[ReactiveSymbols.createProxy](val);

		obj[prop] = val;

		if (!prop.startsWith('_')) for (let observer of this._observers) observer(prop);

		return true;
	}

	[ReactiveSymbols.deleteProperty](obj, prop) {
		this[ReactiveSymbols.set](obj, prop, undefined);
		delete obj[prop];
	}

	observe(callback) {
		this._observers.push(callback);
	}
}
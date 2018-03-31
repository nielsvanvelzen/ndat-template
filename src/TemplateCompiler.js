export const NODE_TYPE = {
	ELEMENT_NODE: 1,
	// ATTRIBUTE_NODE: 2, // deprecated
	TEXT_NODE: 3,
	// CDATA_SECTION_NODE: 4, // deprecated
	// ENTITY_REFERENCE_NODE: 5, // deprecated
	// ENTITY_NODE: 6, // deprecated
	PROCESSING_INSTRUCTION_NODE: 7,
	COMMENT_NODE: 8,
	DOCUMENT_NODE: 9,
	DOCUMENT_TYPE_NODE: 10,
	DOCUMENT_FRAGMENT_NODE: 11,
	// NOTATION_NODE: 12, // deprecated

	get(value) {
		return Object.entries(this) // Get all entries
			.filter(entry => entry[1] === value) // Find the correct value
			.map(entry => entry[0]) // Get the name of the entry
			.shift() || null; // return entry or null if not found
	}
};

export class Template {
	constructor(templateData) {
		this._templateData = templateData;
	}

	mount(container) {
		container.appendChild(this._render(this._templateData));
	}

	_render(tpl, container = null) {
		console.log('render', tpl);

		if (tpl.type === 'text') {
			let text = new Text(tpl.content);
			if (container) container.appendChild(text);

			return text;
		} else if (tpl.type === 'element') {
			let element = document.createElement(tpl.name);
			if (container) container.appendChild(element);

			if (tpl.children) for (let child of tpl.children)	
				this._render(child, element);
			
			return element;
		} else if (tpl.type === 'for') {
			if (tpl.children) for (let child of tpl.children)	
				this._render(child, container);
		}
	}
}

export class TemplateCompiler {
	compile(source) {
		if (source instanceof HTMLElement)
			source = source.outerHTML;
		
		let container = document.createElement('div');
		container.insertAdjacentHTML('beforeend', source);
		
		return new Template(this._compileNode(container));
	}

	_compileNode(node) {
		let nodeTypeCompilers = {
			[NODE_TYPE.ELEMENT_NODE]: this._compileElement,
			[NODE_TYPE.TEXT_NODE]: this._compileText
		};

		if (node.nodeType in nodeTypeCompilers)
			return nodeTypeCompilers[node.nodeType].call(this, node);

		return null;
	}

	_compileAttributes(element) {
		let template = {
			attributes: {},
			properties: {},
			events: {},
		};

		for (let attr of element.attributes) {
			let { name, value } = attr;

			if (name.startsWith('@')) // Attributes starting with @ get converted to events
				template.events[name.substr(1)] = value;
			else if (name.startsWith(':')) // Attributes starting with : get converted to properties
				template.properties[name.substr(1)] = value;
			else
				template.attributes[name] = value;
		}
		
		return template;
	}

	_compileElement(element) {
		let template = {};
		template.type = 'element';
		template.name = element.nodeName;
		template = { ...template, ...this._compileAttributes(element) };
		template.children = this._compileChildren(element);

		if ('v-for' in template.attributes) {
			let expression = template.attributes['v-for'];
			delete template.attributes['v-for'];

			return {
				type: 'for',
				expression,
				children: [template]
			};
		}

		return template;
	}

	_compileText(text) {
		if (text.isElementContentWhitespace || text.wholeText.trim().length === 0) // Check if text element is empty
			return null;
		
		return {
			type: 'text',
			content: text.wholeText
		};
	}

	_compileChildren(node) {
		let children = [];
		
		for (let child of node.childNodes) {
			let childTemplate = this._compileNode(child);

			if (childTemplate !== null)
				children.push(childTemplate);
		}

		return children;
	}
}

// Examples
export const exampleForTemplate = {
	type: 'element',
	name: 'ul',
	children: [{
		type: 'for',
		expression: 'item of [1, 2, 3]',
		children: [{
			type: 'element',
			name: 'li',
			children: [{
				type: 'text',
				content: '{{ item }}'
			}]
		}]
	}]
};
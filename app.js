class Data {
	/**
	 * @param {string[] | string[][]} value
	 */
	constructor(value) {
		if (!(value instanceof Array)) {
			this.value = []
		} else this.value = value
	}

	/**
	 * @param {HTMLDivElement} element
	 */
	append(element) {
		var container = B.createObjectView(this.value, element)
		container.style.border = "1px black solid"
		container.style.backgroundColor = "#eeeeee"
		container.style.maxHeight = "200px"
		container.style.overflow = "scroll"
		element.appendChild(container)
	}
}

/**
  * @typedef {{ type:string, data: Object<string,any>, hide: boolean }} ProcessingStep
  * @type {ProcessingStep[]}
  */ var steps = []

/**
 * @type {Object<string, {append: function(ProcessingStep, HTMLDivElement, Data, Data[], Object<string, Data>): void, process: function(Data, Object<string,Data>, ProcessingStep): Data, isSource: boolean}>}
 */ var types = {
	"text": {
		isSource: true,
		append(step, div) {
			var textarea = document.createElement("textarea")
			textarea.style.padding = "10px 10px 10px 10px"
			textarea.style.marginBottom = "10px"
			textarea.style.marginTop = "10px"
			textarea.style.display = "block"
			textarea.contentEditable = true
			textarea.style.width = "calc(100% - 20px)"
			textarea.style.resize = "none"
			textarea.style.height = "200px"
			textarea.spellcheck = false
			textarea.value = step.data.text || ""
			textarea.onchange = () => {
				step.data.text = textarea.value
				reflow()
			}
			div.appendChild(document.createElement("button").setAttributes({
				onclick: () => {
					B.loadFile("*").then(([file]) => {
						var reader = new FileReader()
						reader.onload = (_, event) => {
							step.data.text = reader.result
							reflow()
						}
						reader.onerror = (_, err) => {

						}
						reader.readAsText(file)

					}, () => { })
				}
			}, "Upload File"))
			div.appendChild(document.createElement("span").setAttributes({}, " Parse JSON: "))
			div.appendChild(document.createElement("input").setAttributes({
				type: "checkbox", checked: step.data.isJson, onchange: (event) => {
					step.data.isJson = event.target.checked
					reflow()
				}
			}))
			div.appendChild(document.createElement("span").setAttributes({}, " Split lines: "))
			div.appendChild(document.createElement("input").setAttributes({
				type: "checkbox", checked: step.data.isSplitting, onchange: (event) => {
					step.data.isSplitting = event.target.checked
					reflow()
				}
			}))
			div.appendChild(textarea)
		},
		process(data, context, step) {
			var value = [];
			step.data.text = step.data.text || "";
			(step.data.isSplitting ? step.data.text.split(/\r?\n/g) : [step.data.text]).map((text) => {
				if (!step.data.isJson) value.push(text)
				else {
					let data
					try {
						data = JSON.parse(step.data.text || "")
					} catch (err) {
						return new Data([err.stack.split("\n")])
					}
					if (!(data instanceof Array)) {
						data = [data]
					}
					value.push(data)
				}
			})
			return new Data(value)


		}
	},
	"lines": {
		process(data) {
			return new Data(data.value.map(v => (v instanceof Array ? v : B.toString(v)).split(/\r?\n/g)))
		}
	},
	"chars": {
		process(data) {
			return new Data(data.value.map(v => (v instanceof Array ? v : B.toString(v)).split("")))
		}
	},
	"split": {
		process(data, context, step) {
			var delimiter = step.data.delimiter
			if (/^\/.*?\/[a-z]*$/.test(delimiter)) {
				try {
					var regex = eval(delimiter)
				} catch (err) {

				}
				if (Object.prototype.toString.apply(regex) == "[object RegExp]") {
					delimiter = regex
				}
			}

			return new Data(data.value.map(v => (v instanceof Array ? v : B.toString(v)).split(delimiter || "")))
		},
		append(step, div) {
			div.appendChild(document.createElement("span").setAttributes({}, "Delimiter: "))
			div.appendChild(document.createElement("input").setAttributes({
				value: step.data.delimiter || "", onchange: (event) => {


					step.data.delimiter = event.target.value
					reflow()
				}
			}))
		}
	},
	"join": {
		process(data, context, step) {
			var delimiter = step.data.delimiter
			if (/^".*?"$/.test(delimiter)) {
				try {
					var string = JSON.parse(delimiter)
				} catch (err) {

				}
				if (typeof string == "string") {
					delimiter = string
				}
			}
			return new Data(data.value.map(v => v instanceof Array ? v.join(delimiter || "") : v))
		},
		append(step, div) {
			div.appendChild(document.createElement("span").setAttributes({}, "Delimiter: "))
			div.appendChild(document.createElement("input").setAttributes({
				value: step.data.delimiter || "", onchange: (event) => {
					step.data.delimiter = event.target.value
					reflow()
				}
			}))
		}
	},
	"flatten": {
		process(data) {
			var ret = []
			data.value.forEach(v => ret.push(...v))
			return new Data(ret)
		}
	},
	"at": {
		append(step, div, data, datas) {
			div.appendChild(document.createElement("span").setAttributes({}, "Index: "))
			div.appendChild(document.createElement("input").setAttributes({
				type: "range",
				step: 1,
				min: 0,
				max: datas[datas.indexOf(data) - 1].value.map(v => (v instanceof Array ? v : B.toString(v)).length - 1).max(),
				value: parseInt(step.data.index).notNaN(),
				onchange: (event) => {
					step.data.index = parseInt(event.target.value).notNaN()
					reflow()
				}
			}))
		},
		process(data, context, step) {
			return new Data(data.value.map(v =>
				(v instanceof Array ? v : B.toString(v))[step.data.index]
			))
		}
	},
	"slice": {
		append(step, div, data, datas) {
			div.appendChild(document.createElement("span").setAttributes({}, "Start: "))
			div.appendChild(document.createElement("input").setAttributes({
				type: "range",
				step: 1,
				min: 0,
				max: datas[datas.indexOf(data) - 1].value.map(v => (v instanceof Array ? v : B.toString(v)).length).max(),
				value: parseInt(step.data.index).notNaN(),
				onchange: (event) => {
					step.data.index = parseInt(event.target.value).notNaN()
					reflow()
				}
			}))
			div.appendChild(document.createElement("span").setAttributes({}, " End: "))
			div.appendChild(document.createElement("input").setAttributes({
				type: "range",
				step: 1,
				min: 0,
				max: datas[datas.indexOf(data) - 1].value.map(v => (v instanceof Array ? v : B.toString(v)).length).max(),
				value: parseInt(step.data.indexE).notNaN(),
				onchange: (event) => {
					step.data.indexE = parseInt(event.target.value).notNaN()
					reflow()
				}
			}))
		},
		process(data, context, step) {
			return new Data(data.value.map(v =>
				(v instanceof Array ? v : B.toString(v)).slice(parseInt(step.data.index).notNaN(), parseInt(step.data.indexE).notNaN())
			))
		}
	},
	parseFloat: {
		process(data) {
			return new Data(data.value.map(v => parseFloat(B.toString(v))))
		}
	},
	map: {
		append(step, div, data, datas) {
			div.appendChild(document.createElement("button").setAttributes({
				onclick: () => {
					var parent = B.createModalWindow()
					var canvas = document.createElement("canvas")
					canvas.setSize([500, 500])
					canvas.style.resize = "both"
					canvas.style.display = "block"
					parent.appendChild(canvas)
					var ctx = canvas.toCtx()
					var graph = new NodeGraph(ctx, Array.getFilled(parseInt(step.data.oAmount) || 1, (i) => ["untyped", i.toString()]))
					var max = parseInt(step.data.iAmount) || 1
					NodeGraph.prefabs.numbers(graph)
					NodeGraph.prefabs.logic(graph)
					NodeGraph.prefabs.trigonometry(graph)
					NodeGraph.prefabs.string(graph)
					NodeGraph.prefabs.meta(graph)

					graph.registerNodeTemplate("Input", "data", "Data", "$RETURN = __args.data", [[], [
						["number", "Index"],
						["number", "Length"],
						...Array.getFilled(max, (i) => ["untyped", i.toString()])
					]])
					if ("save" in step.data) {
						graph.deserialize(step.data.save)
					}
					var id = setInterval(() => {
						ctx.setSize(canvas.getSize())
						graph.update()
					}, 17)
					parent.appendChild(document.createElement("button").setAttributes({
						onclick: () => {
							step.data.save = graph.serialize()
							step.data.code = graph.compile()
							clearInterval(id)
							parent.delete()
							reflow()
						}
					}, "Save & Exit"))
				}
			}, "Edit"))
			div.appendChild(document.createElement("button").setAttributes({
				onclick: () => {
					step.data.code = "()=>[undefined]"
					reflow()
				}
			}, "Reset"))
			div.appendChild(document.createElement("span").setAttributes({}, " Input amount: "))
			div.appendChild(document.createElement("input").setAttributes({
				type: "number",
				value: parseInt(step.data.iAmount) || 1,
				onchange: (event) => {
					step.data.iAmount = parseInt(event.target.value) || 1
				}
			}))
			div.appendChild(document.createElement("span").setAttributes({}, " Output amount: "))
			div.appendChild(document.createElement("input").setAttributes({
				type: "number",
				value: parseInt(step.data.oAmount) || 1,
				onchange: (event) => {
					step.data.oAmount = parseInt(event.target.value) || 1
				}
			}))

			div.appendChild(document.createElement("code").setAttributes({ style: "display: block; padding: 10px 10px 10px 10px; border: 1px solid black; max-height: 200px; overflow: scroll; margin-top: 10px; margin-bottom: 10px" }, step.data.code))
		},
		process(data, context, step) {
			if (!("code" in step.data) || step.data.code == "() => { throw 'No code compiled' }") {
				step.data.code = "()=>[undefined]"
			}
			return new Data(data.value.map((v, i, { length }) => {
				return eval(step.data.code)({ data: [i, length, ...(v instanceof Array ? v : [v])] })
			}))

		}
	},
	"output": {
		process: (v) => new Data(v.value),
		append(step, div, data, datas) {
			div.appendChild(document.createElement("button").setAttributes({ onclick: () => B.saveFile('data:text/plain;charset=utf-8,' + encodeURIComponent(datas[datas.indexOf(data) - 1].value.map(v => (v instanceof Array ? v.join("\t") : v)).join("\n")),"output.txt")},"Save"))
			div.appendChild(document.createElement("textarea").setAttributes({
				style: "display: block; padding: 10px 10px 10px 10px; max-height: 200px; margin-top: 10px; margin-bottom: 10px; width:calc(100% - 20px); height:200px; resize: vertical",
				readonly: true,
				value: datas[datas.indexOf(data) - 1].value.map(v => (v instanceof Array ? v.join("\t") : v)).join("\n")
			}))
			
			
		}

	}
}

function setup() {
	if ("save" in B.l) {
		steps = B.l.save
		reflow()
	} else {
		B.l.save = steps
	}
	types.toArray().forEach(v => {
		var option = document.createElement("option")
		option.value = v.key
		E.types.appendChild(option)
	})
}

function add() {
	var typeName = E.typeToAdd.value
	if (typeName in types) {
		if (steps.length == 0 && !types[typeName].isSource) {
			alert("Step can not be first")
			return
		}
		var step = {
			type: typeName,
			data: {}
		}
		var index = steps.push(step) - 1;
		reflow()
		window.scroll(0, 1000000)
	}
}

/**
 *
 * @param {ProcessingStep} step
 * @param {Data} data
 */
function createStepElement(step, data, datas, context) {
	var type = types[step.type]
	if (type.isSource) {

	}
	var set = document.createElement("fieldset")
	set.style.marginBottom = "10px"
	E.maxParent.appendChild(set)
	var legend = document.createElement("legend")
	legend.appendChild(document.createTextNode(step.type.replace(/([A-Z])/g, " $1").firstUpper() + " "))
	var remove = document.createElement("button")
	remove.innerText = "Remove"
	legend.appendChild(remove)
	var index = steps.indexOf(step)
	remove.onclick = () => {
		if (index == 0 && steps.length > 1 && !types[steps[1].type].isSource) {
			alert("Next step cannot be first")
			return
		}
		if (confirm("Really?")) {
			steps.splice(index, 1)
			reflow()
		}
	}
	if (index != 0) {
		let up = document.createElement("button")
		up.innerText = "Up"
		legend.appendChild(up)
		up.onclick = () => {
			if (index == 1 && !type.isSource) return alert("This step cannot be first")
			var temp = steps[index]
			steps[index] = steps[index - 1]
			steps[index - 1] = temp
			reflow()
		}
	}
	if (index < steps.length - 1) {
		let up = document.createElement("button")
		up.innerText = "Down"
		legend.appendChild(up)
		up.onclick = () => {
			if (!types[steps[index + 1].type].isSource) return alert("Next step cannot be first")
			var temp = steps[index]
			steps[index] = steps[index + 1]
			steps[index + 1] = temp
			reflow()
		}
	}
	set.appendChild(legend)
	if ("append" in type) type.append(step, set, data, datas, context)

	data.append(set)
}

function validate(event) {
	if (event.target.value in types) {
		event.target.style.backgroundColor = "#ffffff"
		E.addButton.disabled = false
	} else {
		event.target.style.backgroundColor = "#ffeeee"
		E.addButton.disabled = true
	}
}

function reset() {
	steps.length = 0
	E.maxParent.innerHTML = ""
}

function reflow() {
	var context = {}
	var data = new Data([])
	var datas = []

	while (E.maxParent.childNodes.length > 0) {
		E.maxParent.removeChild(E.maxParent.childNodes[0])
	}

	steps.forEach(v => {
		var type = types[v.type]
		var ret = type.process(data, context, v)
		datas.push(ret)
		data = ret
	})

	steps.forEach((v, i) => {
		createStepElement(v, datas[i], datas, context)
	})
}
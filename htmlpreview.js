(function () {

	var errorDiv = document.getElementById('error');

	var toc = 'https://raw.githubusercontent.com/NationalSecurityAgency/ghidra/master/Ghidra/Features/Base/src/main/help/help/TOC_Source.xml';
	var prefix = 'https://raw.githubusercontent.com/NationalSecurityAgency/ghidra/master/Ghidra/Features/Base/src/main/help/';
	var sharedImages = [
		'images/B.gif',
		'images/D.gif',
		'images/F.gif',
		'images/GHIDRA_1.png',
		'images/I.gif',
		'images/L.gif',
		'images/U.gif',
		'images/V_slash.png',
		'images/binaryData.gif',
		'images/dataTypes.png',
		'images/decompileFunction.gif',
		'images/disk.png',
		'images/document-properties.png',
		'images/down.png',
		'images/function_graph.png',
		'images/left.png',
		'images/memory16.gif',
		'images/notF.gif',
		'images/notes.gif',
		'images/play.png',
		'images/play_again.png',
		'images/redo.png',
		'images/registerGroup.png',
		'images/right.png',
		'images/sitemap_color.png',
		'images/table.png',
		'images/table_go.png',
		'images/undo.png',
		'images/up.png',
		'images/viewmagfit.png',
	];

	var url = location.search.substring(1);
	if (!url) {
		url = toc;
	} else {
		url = `${prefix}${url}`;
	}

	var links = [], scripts = [];

	var replaceAssets = function (data) {
		var parser = new DOMParser()
		var dom = parser.parseFromString(data, 'text/html')

		var asset, a, link, script, i, href, src;
		// Shared directory images
		asset = dom.querySelectorAll('img');
		for (i = 0; i < asset.length; ++i) {
			src = asset[i].attributes.src.value;
			// first shared directory
			if (src.indexOf('help/shared') >= 0) {
				asset[i].attributes.src.value = `https://raw.githubusercontent.com/NationalSecurityAgency/ghidra/master/Ghidra/Framework/Help/src/main/resources/${src}`;
			}
			// second shared directory - pattern conflicts with non-shared :(
			if (sharedImages.indexOf(src) >= 0) {
				asset[i].attributes.src.value = `https://raw.githubusercontent.com/NationalSecurityAgency/ghidra/master/GhidraDocs/${src}`;
			}
			if (src === "help/shared/arrow.gif") {
				var span = dom.createElement('span')
				span.innerText = "→"
				asset[i].parentNode.insertBefore(span, asset[i])
				asset[i].parentNode.removeChild(asset[i])
			}
		}
		//Links
		a = dom.querySelectorAll('a[href]');
		for (i = 0; i < a.length; ++i) {
			originalHref = a[i].attributes.href.value;
			absoluteHref = a[i].href;
			if (originalHref.match(/^(https?:|\/\/)/)) {
				// absolute uri
				// do nothing
			} else if (originalHref.indexOf('help/') === 0) {
				// this is an absolute path within the help docs
				a[i].href = location.protocol + '//' + location.hostname + ':' + location.port + location.pathname + '?' + originalHref;
			} else {
				withoutPrefixHref = absoluteHref.substr(prefix.length)
				a[i].href = location.protocol + '//' + location.hostname + ':' + location.port + location.pathname + '?' + withoutPrefixHref;
			}
		}
		//Stylesheets
		link = dom.querySelectorAll('link[rel=stylesheet]');
		for (i = 0; i < link.length; ++i) {
			href = link[i].href; //Get absolute URL
			if (href.indexOf('help/shared') >= 0) {
				href = `https://raw.githubusercontent.com/NationalSecurityAgency/ghidra/master/Ghidra/Framework/Help/src/main/resources/${link[i].attributes.href.value}`;
			}
			if (href.indexOf('//raw.githubusercontent.com') > 0 || href.indexOf('//bitbucket.org') > 0) { //Check if it's from raw.github.com or bitbucket.org
				links.push(fetchProxy(href, null, 0)); //Then add it to links queue and fetch using CORS proxy
			}
			// remove node from dom, load this manually later
			link[i].parentNode.removeChild(link[i])
		}
		//Scripts
		script = dom.querySelectorAll('script[type="text/htmlpreview"]');
		for (i = 0; i < script.length; ++i) {
			src = script[i].src; //Get absolute URL
			if (src.indexOf('//raw.githubusercontent.com') > 0 || src.indexOf('//bitbucket.org') > 0) { //Check if it's from raw.github.com or bitbucket.org
				scripts.push(fetchProxy(src, null, 0)); //Then add it to scripts queue and fetch using CORS proxy
			} else {
				script[i].removeAttribute('type');
				scripts.push(script[i].innerHTML); //Add inline script to queue to eval in order
			}
			// remove node from dom, load this manually later
			script[i].parentNode.removeChild(script[i])
		}
		return dom.documentElement.outerHTML
	};

	var loadAssets = function () {
		Promise.all(links).then(function (res) {
			for (var i = 0; i < res.length; ++i) {
				loadCSS(res[i]);
			}
		});
		Promise.all(scripts).then(function (res) {
			for (var i = 0; i < res.length; ++i) {
				loadJS(res[i]);
			}
			document.dispatchEvent(new Event('DOMContentLoaded', {bubbles: true, cancelable: true})); //Dispatch DOMContentLoaded event after loading all scripts
		});
	}

	var loadHTML = function (data) {
		if (data) {
			data = data.replace(/<head([^>]*)>/i, '<head$1><base href="' + url + '">').replace(/<script(\s*src=["'][^"']*["'])?(\s*type=["'](text|application)\/javascript["'])?/gi, '<script type="text/htmlpreview"$1'); //Add <base> just after <head> and replace <script type="text/javascript"> with <script type="text/htmlpreview">
			data = replaceAssets(data);

			setTimeout(function () {
				document.open();
				document.write(data);
				document.close();
				loadAssets()
			}, 10); //Delay updating document to have it cleared before
		}
	};

	var loadCSS = function (data) {
		if (data) {
			var style = document.createElement('style');
			style.innerHTML = data;
			document.head.appendChild(style);
		}
	};

	var loadJS = function (data) {
		if (data) {
			var script = document.createElement('script');
			script.innerHTML = data;
			document.body.appendChild(script);
		}
	};

	var loadTOC = function (data) {
		if (data) {
			var parser = new DOMParser()
			var dom = parser.parseFromString(data, 'text/xml')
			var tocroot = dom.querySelector('tocroot')
			var subroot = Array.prototype.slice.apply(tocroot.children)[0];
			html = [
				'<link rel="stylesheet" type="text/css" href="help/shared/DefaultStyle.css">',
				'<h1>Ghidra documentation</h1>',
				'<p>Shows Ghidra documentation in your web browser, which you\'d normally need to download and install Ghidra to view.</p>',
				'<p>More information at <a href="https://github.com/rcambrj/ghidra-docs">https://github.com/rcambrj/ghidra-docs</a></p>',
			].join('\n');
			html = replaceAssets(html);
			var dom = parser.parseFromString(html, 'text/html')
			ulElement = document.createElement('ul');
			dom.body.appendChild(ulElement);
			ulElement.appendChild(getTOCElement(subroot));
			setTimeout(function () {
				document.open();
				document.write(dom.documentElement.innerHTML);
				document.close();
				loadAssets()
			}, 10); //Delay updating document to have it cleared before
		}
	}

	var getTOCElement = function (tocElement) {
		var listItem = document.createElement('li')
		var anchorElement = document.createElement('a')
		anchorElement.innerText = (tocElement.attributes.text || tocElement.attributes.id || {}).value;
		if (tocElement.attributes.target) {
			anchorElement.href = `?${tocElement.attributes.target.value}`;
		}
		listItem.appendChild(anchorElement)

		var children = Array.prototype.slice.apply(tocElement.children);
		if (children.length) {
			var unorderedList = document.createElement('ul')
			children.forEach(function (child) {
				unorderedList.appendChild(getTOCElement(child));
			})
			listItem.appendChild(unorderedList)
		}

		return listItem
	}

	var fetchProxy = function (url, options, i) {
		var proxy = [
			'', // try without proxy first
			'https://api.codetabs.com/v1/proxy/?quest='
		];
		return fetch(proxy[i] + url, options).then(function (res) {
			if (!res.ok) throw new Error('Cannot load ' + url + ': ' + res.status + ' ' + res.statusText);
			return res.text();
		}).catch(function (error) {
			if (i === proxy.length - 1)
				throw error;
			return fetchProxy(url, options, i + 1);
		})
	};

	if (url && url.indexOf(location.hostname) < 0) {
		fetchProxy(url, null, 0).then(function (data) {
			if (url.endsWith('TOC_Source.xml')) {
				return loadTOC(data)
			}
			return loadHTML(data)
		}).catch(function (error) {
			console.error(error);
			errorDiv.style.display = 'block';
			errorDiv.innerText = error;
		});
	}
})()
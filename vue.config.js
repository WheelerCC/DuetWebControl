const AutoImportsPlugin = require("./webpack/lib/auto-imports-plugin.js");
const CustomImportsPlugin = require("./webpack/lib/custom-imports-plugin.js");
const CompressionPlugin = require("compression-webpack-plugin");
const fs = require("fs"), path = require("path");
const { EnvironmentPlugin } = require("webpack");
const EventHooksPlugin = require("event-hooks-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");
const { VuetifyPlugin } = require('webpack-plugin-vuetify')

module.exports = {
	lintOnSave: true,
	configureWebpack: {
		devtool: "source-map",
		optimization: {
			chunkIds: "named",
			concatenateModules: false,
			flagIncludedChunks: false,
			mergeDuplicateChunks: false,
			moduleIds: "named",
			removeAvailableModules: false,
			splitChunks: {
				cacheGroups: {
					babylon: {
						test: /[\\/]node_modules[\\/](@babylonjs|babylon|babylonjs-gltf2interface)[\\/]/,
						name: "babylon",
						chunks: "all"
					},
					monacoEditor: {
						test: (module) => module.context && /[\\/]node_modules[\\/]monaco-editor[\\/]/.test(module.context),
						name: "monaco-editor",
						chunks: "all"
					}
				}
			},
			usedExports: false
		},
		performance: {
			hints: false
		},
		plugins: [
			new VuetifyPlugin({
				styles: { configFile: 'src/scss/variables.scss' }
			}),
			new AutoImportsPlugin(),
			new EnvironmentPlugin({
				"BUILD_DATETIME": (new Date()).toString()
			}),
			...((process.env.NODE_ENV === "production") ? [
				new CustomImportsPlugin(),
				new EventHooksPlugin({
					beforeCompile() {
						const apiDocs = path.resolve(__dirname, "./DuetAPI.xml")
						if (fs.existsSync(apiDocs)) {
							fs.copyFileSync(apiDocs, path.resolve(__dirname, "./public/DuetAPI.xml"));
						} else {
							const dsfApiDocs = path.resolve(__dirname, "../DuetSoftwareFramework/src/DuetAPI/DuetAPI.xml");
							if (fs.existsSync(dsfApiDocs)) {
								fs.copyFileSync(dsfApiDocs, path.resolve(__dirname, "./public/DuetAPI.xml"));
							}
						}
					},
					afterEmit() {
						const apiDocs = path.resolve(__dirname, "./public/DuetAPI.xml");
						if(fs.existsSync(apiDocs)) {
							fs.unlinkSync(apiDocs);
						}
					}
				}),
				new CompressionPlugin({
					exclude: /\.zip$/,
					minRatio: Infinity
				}),
				...((process.env.NOZIP) ? [] : [
					new ZipPlugin({
						filename: "DuetWebControl-SD.zip",
						include: [/\.gz$/, /\.woff$/, /\.woff2$/],
						exclude: ["robots.txt"]
					}),
					new ZipPlugin({
						filename: "DuetWebControl-SBC.zip",
						exclude: [/\.gz$/, /\.zip$/]
					})
				])
			] : [])
		],
		resolve: {
			extensions: [".ts", ".js"],
			alias: {
                'vue': '@vue/compat'
            }
		}
	},
	chainWebpack: config => {
		// config.resolve.alias.set('vue', '@vue/compat');

		config.module.rule('vue')
			.use('vue-loader')
			.tap((options) => {
				return {
				...options,
				compilerOptions: {
					compatConfig: {
						MODE: 2,
						GLOBAL_MOUNT: false,
						GLOBAL_EXTEND: false,
						GLOBAL_PROTOTYPE: false,
						GLOBAL_SET: true,
						GLOBAL_DELETE: true,
						GLOBAL_OBSERVABLE: false,
						CONFIG_KEY_CODES: true,
						CONFIG_WHITESPACE: true,
						INSTANCE_SET: true,
						INSTANCE_DELETE: true,
						INSTANCE_EVENT_EMITTER: true,
						INSTANCE_EVENT_HOOKS: true,
						INSTANCE_CHILDREN: true,
						INSTANCE_LISTENERS: true,
						INSTANCE_SCOPED_SLOTS: true,
						INSTANCE_ATTRS_CLASS_STYLE: true,
						OPTIONS_DATA_FN: true,
						OPTIONS_DATA_MERGE: true,
						OPTIONS_BEFORE_DESTROY: true,
						OPTIONS_DESTROYED: true,
						WATCH_ARRAY: true,
						V_ON_KEYCODE_MODIFIER: true,
						CUSTOM_DIR: true,
						ATTR_FALSE_VALUE: true,
						ATTR_ENUMERATED_COERCION: true,
						TRANSITION_GROUP_ROOT: true,
						COMPONENT_ASYNC: true,
						COMPONENT_FUNCTIONAL: true,
						COMPONENT_V_MODEL: true,
						RENDER_FUNCTION: true,
						FILTERS: true,
						COMPILER_IS_ON_ELEMENT: true,
						COMPILER_V_BIND_SYNC: true,
						COMPILER_V_BIND_PROP: true,
						COMPILER_V_BIND_OBJECT_ORDER: true,
						COMPILER_V_ON_NATIVE: true,
						COMPILER_V_FOR_REF: true,
						COMPILER_NATIVE_TEMPLATE: true,
						COMPILER_FILTERS: true,
					}
				}
				}
			})
			
		config.optimization.minimizer("terser").tap(args => {
			const { terserOptions } = args[0];
			terserOptions.keep_classnames = true;
			terserOptions.keep_fnames = true;
			return args;
		});
		config.optimization.set("splitChunks", {
			chunks: "all",
			cacheGroups: {
				defaultVendors: false,
				default: false
			}
		});
		config.plugins.delete("prefetch");
		config.plugins.delete("hash-module-ids");
	},
	pwa: {
		name: "Duet Web Control",
		themeColor: "#2196f3",
		appleMobileWebAppCapable: "yes",
		appleMobileWebAppStatusBarStyle: "black",
		workboxOptions: {
			maximumFileSizeToCacheInBytes: 20000000		// 20MB
		}
	},
	transpileDependencies: [
		"vuetify"
	]
}

/**
 * DO NOT MODIFY THIS FILE! IT IS AUTO-GENERATED ON COMPILATION!
*/
import { initCollection } from "@duet3d/objectmodel";
import DwcPlugin from "./DwcPlugin";

export default initCollection(DwcPlugin, [
	{
        id: "BtnCmd",
        name: "BtnCmd",
        author: "Minty Trebor",
        version: "01.03.08",
        loadDwcResources: () => import(
            /* webpackChunkName: "BtnCmd" */
            "./BtnCmd/src/index"
        )
    },
	{
        id: "GCodeViewer",
        name: "G-Code Viewer",
        author: "Juan Rosario",
        version: "3.6.2",
        loadDwcResources: () => import(
            /* webpackChunkName: "GCodeViewer" */
            "./GCodeViewer/index"
        )
    },
	{
        id: "HeightMap",
        name: "Height Map",
        author: "Duet3D Ltd",
        version: "3.6.2",
        loadDwcResources: () => import(
            /* webpackChunkName: "HeightMap" */
            "./HeightMap/index"
        )
    },
	{
        id: "HmiWizards",
        name: "HmiWizards",
        author: "William Wheeler",
        version: "0.0.1",
        loadDwcResources: () => import(
            /* webpackChunkName: "HmiWizards" */
            "./HmiWizards/index"
        )
    },
	{
        id: "InputShaping",
        name: "Input Shaping",
        author: "Duet3D Ltd",
        version: "3.6.2",
        loadDwcResources: () => import(
            /* webpackChunkName: "InputShaping" */
            "./InputShaping/index"
        )
    },
	{
        id: "ObjectModelBrowser",
        name: "Object Model Browser",
        author: "Duet3D Ltd",
        version: "3.6.2",
        loadDwcResources: () => import(
            /* webpackChunkName: "ObjectModelBrowser" */
            "./ObjectModelBrowser/index"
        )
    },
	{
        id: "OnScreenKeyboard",
        name: "On-Screen Keyboard",
        author: "Duet3D Ltd",
        version: "3.6.2",
        loadDwcResources: () => import(
            /* webpackChunkName: "OnScreenKeyboard" */
            "./OnScreenKeyboard/index"
        )
    },
]);

import {SVG} from '@svgdotjs/svg.js';
import * as d3 from "d3";
import {drawNodeLink} from "../local-view/core";
import {getLayerWidthHeight} from "../common/create-layer";
import {rgbToHex} from "../common/utils";
import {createInfoBox} from "../common/interactive";
import {drawLegend} from "./legend";

async function drawTemporalMatrix() {
    let matrix_csv = await d3.csv('assets/data/matrix/new_community_evolution.csv');
    let size_csv = await d3.csv('assets/data/matrix/new_community_sizes_matrix.csv');

    const formattedData = formatCsvData(matrix_csv);
    const formattedSize = formatCsvData(size_csv);

    let {width, height} = getLayerWidthHeight(undefined, '.temporal-matrix');

    let layer = SVG(document.querySelector('.temporal-matrix'))
    let gridLayer = layer.group().addClass('grid-layer').transform({translate: [width / 4, height / 8]});
    let eventLayer = layer.group().addClass('event-layer').transform({translate: [width / 4, height / 8]});
    let circleLayer = layer.group().addClass('circle-layer').transform({translate: [width / 4, height / 8]});


    const gridSize = 30;
    const offsetX = 100;
    const offsetY = 20;

    appState.communityLabelMap = buildValueToPreviousValueMap(formattedData,formattedSize);

    // 绘制网格
    drawGrid(gridLayer, formattedData, gridSize, offsetX, offsetY);

    // 绘制圆圈并绑定事件
    const circleData = drawCircles(circleLayer, formattedData, formattedSize, gridSize, offsetX, offsetY);

    // 绘制事件连接线和三角形
    drawEvents(eventLayer, formattedData, formattedSize, circleData, gridSize, offsetX, offsetY);

    // 示例额外事件数组
    // const extraEvents = [
    //     ['C6-1-3', 'C6-2-8', 0],
    //     ['C1-3-4', 'C2-3-4', -1],
    //     ['C6-1-3', 'C7-2-35', 0],
    //     ['C7-4-2', 'C7-5-7', 0],
    //     ['C6-4-1','C7-5-7',  1],
    //     ['C7-9-6', 'C6-10-2', 1],
    //     ['C7-9-6', 'C7-10-32', 1],
    //     ['C9-5-15', 'C7-6-7', 1],
    //     ['C8-4-6', 'C9-5-15', 1],
    //     ['C10-4-2', 'C9-5-15', 1],
    //     ['C11-7-26', 'C12-8-21', 1],
    //     ['C12-8-21', 'C13-9-7', 1],
    // ];
    const extraEvents = [
        // ['C9-1-3', 'C9-2-8', 0],
        ['C1-3-4', 'C2-3-4', -1],
        ['C9-1-3', 'C10-2-35', 0],
        ['C10-4-2', 'C10-5-7', 0],
        ['C9-4-1','C10-5-7',  1],
        ['C10-9-6', 'C9-10-2', 1],
        ['C10-9-6', 'C10-10-32', 1],
        ['C12-5-15', 'C10-6-7', 1],
        ['C11-4-6', 'C12-5-15', 1],
        ['C13-4-2', 'C12-5-15', 1],
        ['C14-7-26', 'C15-8-21', 1],
        ['C15-8-21', 'C16-9-7', 1],
        ['C5-9-20', 'C6-10-1', 1],
        ['C6-9-16', 'C6-10-1', 1],
        ['C7-9-17', 'C6-10-1', 1],
        ['C6-10-1', 'C9-10-2', -1],
    ];

    // A5-4-7需要绘制一个节点1虚拟的

    // 绘制额外事件 (如果有)
    drawExtraEvents(eventLayer, extraEvents,circleLayer);

    // 绘制图例
    drawLegend();
}


function drawGrid(draw, csvData, gridSize, offsetX, offsetY) {
    const cols = csvData[0].length;
    const rows = 16; // 固定为16行

    const dashedLineStyle = {stroke: "#dcdcdc", "stroke-width": 1, "stroke-dasharray": "5,5"}; // 更浅的网格线

    // 绘制水平网格线并设置行标签
    for (let row = 1; row <= rows+1; row++) {
        draw.line(offsetX, row * gridSize + offsetY, gridSize * (cols + 1) + offsetX, row * gridSize + offsetY).attr(dashedLineStyle);
        // 使用 A1, A2, ... 作为行标签
        const label = `A${row}`;
        // 调整行标签位置，确保与水平网格线有一定间距
        draw.text(label).move(offsetX - 35, row * gridSize + offsetY - 12)
            .font({family: 'Arial', size: 15, weight: '100', anchor: 'middle'});
    }

    // 绘制垂直网格线并设置列标签
    for (let col = 1; col <= cols; col++) {
        draw.line(col * gridSize + offsetX, offsetY, col * gridSize + offsetX, gridSize * rows + offsetY + gridSize).attr(dashedLineStyle);
        // 使用CSV中的2024xx格式作为列标签
        const label = col;
        // 调整列标签位置，确保对齐垂直网格线，并适当倾斜
        draw.text(label).move(col * gridSize + offsetX, offsetY - 40)
            .font({family: 'Arial', size: 15, weight: '100', anchor: 'middle'})
    }
}

function drawCircles(draw, csvData, csvSize, gridSize, offsetX, offsetY) {
    const infoBox = createInfoBox();

    const minSize = d3.min(csvSize.slice(1).flat().filter(d => d !== 0)); // 获取最小值
    const maxSize = d3.max(csvSize.slice(1).flat().filter(d => d !== 0)); // 获取最大值
    const scale = d3.scaleLinear()
        .domain([minSize, maxSize])
        .range([5, 14]);

    const colorScale = d3.scaleLinear()
        .domain([0, 1])  // 范围 [0, 1] 会映射到颜色值
        .range(["#deeccf", "#0a2f51"]);

    const rows = csvData.length - 1;
    const cols = csvData[0].length;

    // 用于跟踪已绘制的元素
    const drawnElements = new Set();
    // 存储绘制的圆圈数据，用于后续绘制事件
    const circleDataMap = new Map();

    // 绘制圆圈并添加事件
    for (let row = 1; row <= rows; row++) {
        // 获取当前行的非零数据范围
        const rowData = csvSize[row].slice(1).filter(d => d !== 0);
        const rowMin = d3.min(rowData) === undefined ? 0 : d3.min(rowData);
        const rowMax = d3.max(rowData) === undefined ? 0 : d3.max(rowData);

        // 为当前行创建颜色比例尺
        const rowColorScale = d3.scaleLinear()
            .domain([rowMin, rowMax])
            .range([0, 1]);

        // 处理多行数据情况
        for (let col = 0; col < cols; col++) {
            const currentValue = csvData[row][col];

            // 检查当前元素是否是压缩行格式
            if (typeof currentValue === 'string' && currentValue.includes('[')) {
                // 解析压缩行数据 [a, b]
                const values = JSON.parse(currentValue.replace(/'/g, '"'));

                // 为每个值单独绘制
                values.forEach((value, subIndex) => {
                    const subRow = row + subIndex;  // 在不同行绘制
                    const circleInfo = drawSingleCircle(draw, value, col + 1, subRow, csvSize[row][col],
                                    gridSize, offsetX, offsetY, scale, colorScale, rowColorScale,
                                    infoBox, drawnElements, csvData[row][col-1]);

                    if (circleInfo) {
                        const key = `${subRow}-${col+1}`;
                        circleDataMap.set(key, circleInfo);
                    }
                });
            } else {
                // 处理单个值的情况
                const circleInfo = drawSingleCircle(draw, currentValue, col + 1, row, csvSize[row][col],
                                              gridSize, offsetX, offsetY, scale, colorScale, rowColorScale,
                                              infoBox, drawnElements, col > 0 ? csvData[row][col-1] : null);

                if (circleInfo) {
                    const key = `${row}-${col+1}`;
                    circleDataMap.set(key, circleInfo);
                }

                // 如果返回false，说明需要终止当前行的绘制
                if (circleInfo === false) {
                    break;
                }
            }
        }
    }

    return circleDataMap;
}

/**
 * 绘制单个圆圈
 * @returns {boolean|Object} 返回false表示终止当前行绘制，返回对象表示圆圈信息
 */
function drawSingleCircle(draw, value, col, row, sizeValue, gridSize, offsetX, offsetY,
                         scale, colorScale, rowColorScale, infoBox, drawnElements, previousValue) {
    let timeLabel = [202401, 202402, 202403, 202404, 202405, 202406, 202407, 202408, 202409, 202410];
    if (value === -1) return null;

    const cx = col * gridSize + offsetX;
    const cy = row * gridSize + offsetY;

    const timeSlice = appState.timeSlices ? appState.timeSlices[col-1] : col;
    const elementKey = `${timeSlice}-${value}`;

    // 检查元素是否已绘制
    if (drawnElements.has(elementKey)) {
        // 特殊情况：前一个值为 -1 时，即使当前值已绘制，也需要继续绘制
        if (previousValue !== -1) {
            // 终止当前行的绘制
            return false;
        }
    }

    // 记录已绘制元素
    drawnElements.add(elementKey);

    let radius = scale(sizeValue + 1);
    let hexColor = rgbToHex(colorScale(rowColorScale(sizeValue)));

    // 创建唯一ID
    const circleId = `C${row}-${timeSlice}-${value}`;

    const circle = draw
        .circle(radius)
        .move(cx - radius / 2, cy - radius / 2)
        .fill(hexColor === undefined ? 'red' : hexColor).stroke('black')
        .attr('id', circleId); // 设置圆圈的ID

    circle.data('community', value);
    circle.data('time-slice', timeLabel[timeSlice-1]);
    circle.data('size', sizeValue);

    // 点击事件
    circle.on('click', function () {
        appState.community = circle.data('community');
        appState.timeSlice = circle.data('time-slice');
        // 绘制ascore
        d3.selectAll('#link-layer').remove();
        d3.selectAll('#node-layer').remove();
        drawNodeLink(appState.community, appState.timeSlice, "agg");
    });

    // 鼠标悬停事件
    circle.on('mouseover', async function (event) {
        const community = circle.data('community');
        const timeSlice = circle.data('time-slice');

        let comm_data = await d3.csv(`assets/data/${timeSlice}/handle/superNode.csv`)

        let info_data = comm_data[community];
        info_data['Time Slice'] = timeSlice;


        infoBox.style.display = 'block';
        infoBox.style.opacity = 1;
        infoBox.innerHTML = '';

        const excludeFields = ['log_influence', 'radius', 'angle', 'x', 'y'];
        const decimalFields = ['influence', 'rich_club','k_core','clustering','structural_entropy','betweenness'];
        const filteredData = Object.fromEntries(
            Object.entries(info_data)
                .filter(([key, value]) => !excludeFields.includes(key))
                .map(([key, value]) => {
                    if (decimalFields.includes(key)) {
                        value = Number(value).toFixed(2);
                    }
                    return [key, value];
                })
        );
        Object.entries(filteredData).forEach(([key, value]) => {
            const infoLine = document.createElement('div');
            infoLine.textContent = `${key}: ${value}`;
            infoBox.appendChild(infoLine);
        });

        infoBox.style.left = `${event.pageX + 10}px`;
        infoBox.style.top = `${event.pageY + 10}px`;
    });

    // 鼠标移出事件
    circle.on('mouseout', function () {
        infoBox.style.opacity = 0;
        setTimeout(() => {
            infoBox.style.display = 'none';
        }, 10);
    });

    // 返回圆圈信息，用于后续绘制事件
    return {
        cx: cx,
        cy: cy,
        radius: radius,
        value: value,
        size: sizeValue
    };
}

/**
 * 绘制事件连接线和三角形
 */
function drawEvents(draw, csvData, csvSize, circleDataMap, gridSize, offsetX, offsetY) {
    const rows = csvData.length - 1;
    const cols = csvData[0].length;

    const minSize = d3.min(csvSize.slice(1).flat().filter(d => d !== 0));
    const maxSize = d3.max(csvSize.slice(1).flat().filter(d => d !== 0));
    const scale = d3.scaleLinear()
        .domain([minSize, maxSize])
        .range([5, 14]);

    // 遍历所有行（除了第一行表头）
    for (let row = 1; row <= rows; row++) {
        // 跳过A3和A4行的事件绘制
        // if (row === 9 || row === 10) continue;

        // 遍历每一列（除了最后一列）
        for (let col = 0; col < cols - 1; col++) {
            const currentValue = csvData[row][col];
            const nextValue = csvData[row][col + 1];

            // 如果当前值或下一个值是-1，则跳过
            if (currentValue === -1 || nextValue === -1) continue;

            // 获取当前节点和下一个节点的圆圈数据
            const currentKey = `${row}-${col+1}`;
            const nextKey = `${row}-${col+2}`;

            const currentCircle = circleDataMap.get(currentKey);
            const nextCircle = circleDataMap.get(nextKey);

            // 如果两个节点都存在，才绘制连接
            if (currentCircle && nextCircle) {
                const currentSize = csvSize[row][col];
                const nextSize = csvSize[row][col + 1];

                // 比较两个圆圈的大小
                if (currentSize === nextSize) {
                    // 如果大小相同，绘制直线
                    draw.line(currentCircle.cx, currentCircle.cy, nextCircle.cx, nextCircle.cy)
                        .stroke({width: 2, color: 'black'});
                } else {
                    // 计算三角形顶点坐标
                    let point1, point2, point3;
                    if (currentSize > nextSize && ((currentSize - nextSize) / nextSize) > 0.2) {
                        // 当前节点大于下一个节点时，绘制第一个三角形
                        point1 = [currentCircle.cx, currentCircle.cy + currentCircle.radius / 2 * 0.7];
                        point2 = [currentCircle.cx, currentCircle.cy - currentCircle.radius / 2 * 0.7];
                        point3 = [nextCircle.cx, nextCircle.cy];
                        // 绘制三角形
                        draw.polygon([point1, point2, point3])
                            .fill('gray')
                            .stroke('black');
                    } else if(currentSize < nextSize && ((nextSize - currentSize) / currentSize) > 0.2) {
                        // 下一个节点大于当前节点时，绘制第二个三角形
                        point1 = [nextCircle.cx, nextCircle.cy + nextCircle.radius / 2 * 0.7];
                        point2 = [nextCircle.cx, nextCircle.cy - nextCircle.radius / 2 * 0.7];
                        point3 = [currentCircle.cx, currentCircle.cy];
                        // 绘制三角形
                        draw.polygon([point1, point2, point3])
                            .fill('gray')
                            .stroke('black');
                    }

                }
            }
        }
    }
}

/**
 * 绘制额外的虚线圆
 * @param {Object} draw - SVG绘图层
 * @param {number} row - 行号
 * @param {number} col - 列号
 * @param {number} size - 圆的大小
 * @param {string} label - 圆的标签ID
 * @param {number} gridSize - 网格大小
 * @param {number} offsetX - X轴偏移量
 * @param {number} offsetY - Y轴偏移量
 * @returns {Object} 创建的圆对象
 */
function drawExtraCircle(draw, row, col, size, label, gridSize, offsetX, offsetY) {
    const cx = col * gridSize + offsetX;
    const cy = row * gridSize + offsetY;
    
    // 计算圆的半径，这里简单地使用size作为半径
    const radius = size;
    
    // 创建唯一ID
    const circleId = label;
    
    // 绘制虚线圆
    const circle = draw
        .circle(radius * 2)  // 直径是半径的两倍
        .center(cx, cy)      // 使用center方法让cx,cy表示圆心
        .fill('black')        // 设置为透明填充
        .stroke({ color: 'black', width: 1.5, dasharray: '5,3' })  // 虚线边框
        .attr('id', circleId); // 设置圆圈的ID
    
    // 可以添加数据属性，以便后续交互
    circle.data('type', 'virtual');
    circle.data('community', label.split('-')[2]);
    const timeLabel = [202401, 202402, 202403, 202404, 202405, 202406, 202407, 202408, 202409, 202410];
    circle.data('time-slice', timeLabel[parseInt(label.split('-')[1])-1]);
    
    return circle;
}

/**
 * 绘制额外事件连接线和三角形
 * @param {Object} draw - SVG绘图层
 * @param {Array} extraEvents - 额外事件数组，格式为 [[起始节点ID, 目标节点ID, 绘制方法(0/1)], ...]
 * @param {Map} circleDataMap - 存储所有圆圈数据的Map
 */
function drawExtraEvents(draw, extraEvents,circleLayer) {
    if (!extraEvents || extraEvents.length === 0) return;

    // 绘制所需的额外虚拟圆
    // 例如，为 A5-4-7 绘制一个虚拟圆
    const extraVirtualCircle = drawExtraCircle(circleLayer, 6, 10, 4.05, 'C6-10-1', 30, 100, 20);
    drawExtraCircle(circleLayer, 2, 3, 5.75, 'C2-3-4', 30, 100, 20);
    extraEvents.forEach(event => {
        if (event.length !== 3) {
            console.warn('额外事件格式不正确，应为 [起始节点ID, 目标节点ID, 绘制方法]');
            return;
        }

        const [sourceNodeId, targetNodeId, drawMethod] = event;

        // 使用D3选择器获取ID为sourceNodeId和targetNodeId的圆圈数据
        const sourceCircle = d3.select(`#${sourceNodeId}`);
        const targetCircle = d3.select(`#${targetNodeId}`);

        // 获取圆圈的 cx, cy 和 radius 属性
        const sourceCx = +sourceCircle.attr('cx');
        const sourceCy = +sourceCircle.attr('cy');
        const sourceRadius = +sourceCircle.attr('r');

        const targetCx = +targetCircle.attr('cx');
        const targetCy = +targetCircle.attr('cy');
        const targetRadius = +targetCircle.attr('r');

        // 如果两个节点都存在，才绘制连接
        if (sourceCircle.node() && targetCircle.node()) {
            if (drawMethod === 0) {
                // 第一种绘制方法：起始节点大于目标节点
                // 计算三角形顶点坐标
                const point1 = [sourceCx, sourceCy + sourceRadius / 2 * 0.7];
                const point2 = [sourceCx, sourceCy - sourceRadius / 2 * 0.7];
                const point3 = [targetCx, targetCy];

                // 绘制三角形
                draw.polygon([point1, point2, point3])
                    .fill('#a8a8a8')  // 使用稍微不同的颜色以区分普通事件
                    .stroke({width: 1.5, color: '#606060'});

            } else if (drawMethod === 1) {
                // 第二种绘制方法：目标节点大于起始节点
                // 计算三角形顶点坐标
                const point1 = [targetCx, targetCy + targetRadius / 2 * 0.7];
                const point2 = [targetCx, targetCy - targetRadius / 2 * 0.7];
                const point3 = [sourceCx, sourceCy];

                // 绘制三角形
                draw.polygon([point1, point2, point3])
                    .fill('#a8a8a8')  // 使用稍微不同的颜色以区分普通事件
                    .stroke({width: 1.5, color: '#606060'});
            } else {
                // 如果绘制方法不是0或1，则绘制直线
                draw.line(sourceCx, sourceCy, targetCx, targetCy)
                    .stroke({width: 2, color: '#606060', dasharray: '5,3'});  // 使用虚线以区分普通事件
            }
        } else {
            console.warn(`找不到节点 ${sourceNodeId} 或 ${targetNodeId}`);
        }
    });
}

/**
 * 格式化 CSV 数据
 * @param csvData
 */
function formatCsvData(csvData) {
    const formattedData = [];
    const header = Object.keys(csvData[0]);
    formattedData.push(header);  // 添加表头

    csvData.forEach(row => {
        const rowData = header.map(col => {
            const value = row[col];
            return value === '' ? -1 : parseInt(value);
        });
        formattedData.push(rowData);
    });
    return formattedData;
}



function buildValueToPreviousValueMap(csvData, csvSize) {
    const valueToPreviousValueMap = {};

    // 遍历每一行数据
    for (let rowIndex = 1; rowIndex < csvData.length; rowIndex++) { // 从 1 开始，跳过表头
        const row = csvData[rowIndex];

        // 遍历每一列，除了第一列
        for (let colIndex = 1; colIndex < row.length; colIndex++) {
            const value = row[colIndex];
            const previousValue = row[colIndex - 1];

            const timeSlice = csvSize[0][colIndex];

            // 存储当前值与前一列值的映射
            valueToPreviousValueMap[`${timeSlice}-${value}`] = previousValue;
        }
    }

    return valueToPreviousValueMap;
}


export {drawTemporalMatrix};




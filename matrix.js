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
    let influence_csv = await d3.csv('assets/data/matrix/new_community_influence_matrix.csv');

    const formattedData = formatCsvData(matrix_csv);
    const formattedSize = formatCsvData(size_csv);
    const formattedInfluence = formatCsvData(influence_csv);

    let {width, height} = getLayerWidthHeight(undefined, '.temporal-matrix');




    let layer = SVG(document.querySelector('.temporal-matrix'))
    // let layer = SVG(document.querySelector('.svg-matrix'))
    let gridLayer = layer.group().addClass('grid-layer').transform({translate: [width / 4, height / 8]});
    let eventLayer = layer.group().addClass('event-layer').transform({translate: [width / 4, height / 8]});
    let circleLayer = layer.group().addClass('circle-layer').transform({translate: [width / 4, height / 8]});


    // 根据要求调整网格大小为50
    const gridSize = 45;
    // 调整偏移量以适应更大的网格
    const offsetX = 130;
    const offsetY = 80;

    appState.communityLabelMap = buildValueToPreviousValueMap(formattedData,formattedSize);

    // 绘制网格
    drawGrid(gridLayer, formattedData, gridSize, offsetX, offsetY);

    // 绘制圆圈并绑定事件
    const circleData = drawCircles(circleLayer, formattedData, formattedSize, formattedInfluence, gridSize, offsetX, offsetY);

    // 绘制事件连接线和三角形
    drawEvents(eventLayer, formattedData, formattedSize, circleData, gridSize, offsetX, offsetY);

    // 示例额外事件数组
    const extraEvents = [
        ['C1-3-4', 'C2-3-4', -1],
        ['C9-1-3', 'C10-2-35', 0],
        // ['C10-4-2', 'C10-5-7', 0],
        ['C9-4-1','C10-5-7',  1],
        ['C10-9-6', 'C9-10-2', 0],
        // ['C10-9-6', 'C10-10-32', 1],
        ['C12-5-15', 'C10-6-7', 1],
        ['C11-4-6', 'C12-5-15', 1],
        ['C13-4-2', 'C12-5-15', 1],
        ['C14-7-26', 'C15-8-21', 1],
        ['C15-8-21', 'C16-9-7', 0],
        ['C5-9-20', 'C6-10-1', 1],
        ['C6-9-16', 'C6-10-1', 1],
        ['C7-9-17', 'C6-10-1', 1],
        ['C6-10-1', 'C9-10-2', -1],
    ];

    // 绘制额外事件 (如果有)
    drawExtraEvents(eventLayer, extraEvents, circleLayer);

    // 绘制图例
    drawLegend();
}


function drawGrid(draw, csvData, gridSize, offsetX, offsetY) {
    const cols = csvData[0].length;
    const rows = 16; // 固定为16行

    // 科研风格的网格线样式
    const dashedLineStyle = {
        stroke: "#e0e0e0",
        "stroke-width": 0.8,
        "stroke-dasharray": "3,4"
    };

    // 添加浅色背景，适合科研图表
    draw.rect(gridSize * (cols + 1) + offsetX - offsetX, gridSize * rows + offsetY + gridSize - offsetY)
        .move(offsetX, offsetY)
        .fill('#f7f9fc') // 更柔和的背景色
        .radius(4)
        .opacity(0.6);

    // 添加行标题 - AS Communities
    const rowTitle = draw.text("AS Communities")
        .transform({ rotation: -90 })
        // 逆时针旋转90度
        .font({
            family: 'Arial, sans-serif',
            size: 18, // 较大字体
            weight: 'bold',
            anchor: 'middle',
            fill: '#2c3e50' // 深色调
        });

    // 计算行标题位置 - 在行标签的左侧居中
    const rowTitleX = offsetX - 80;
    const rowTitleY = offsetY + (rows * gridSize) / 2;
    rowTitle.center(rowTitleX, rowTitleY)
        .rotate(-90)// 逆时针旋转90度

    // 添加列标题 - TimeSlice
    const colTitle = draw.text("Time Snapshots")
        .font({
            family: 'Arial, sans-serif',
            size: 18, // 较大字体
            weight: 'bold',
            anchor: 'middle',
            fill: '#2c3e50' // 深色调
        });

    // 计算列标题位置 - 在列标签的上方居中
    const colTitleX = offsetX + (cols * gridSize) / 2;
    const colTitleY = offsetY - 50;
    colTitle.center(colTitleX + 20, colTitleY - 30);

    // 时间切片名称，代替之前的1,2,3...
    const timeSliceLabels = [
        "2024-01", "2024-02", "2024-03", "2024-04", "2024-05",
        "2024-06", "2024-07", "2024-08", "2024-09", "2024-10"
    ];

    // 绘制水平网格线并设置行标签
    for (let row = 1; row <= rows+1; row++) {
        draw.line(offsetX, row * gridSize + offsetY, gridSize * (cols + 1) + offsetX, row * gridSize + offsetY)
            .attr(dashedLineStyle);

        // 使用 A1, A2, ... 作为行标签
        const label = `A${row}`;
        draw.text(label)
            .move(offsetX - 35, row * gridSize + offsetY - 10)
            .font({
                family: 'Arial, sans-serif',
                size: 14, // 较小的字体
                weight: '400',
                anchor: 'middle',
                fill: '#34495e' // 标签颜色
            });
    }

    // 绘制垂直网格线并设置列标签（使用时间切片标签）
    for (let col = 1; col <= cols; col++) {
        draw.line(col * gridSize + offsetX, offsetY, col * gridSize + offsetX, gridSize * rows + offsetY + gridSize)
            .attr(dashedLineStyle);

        // 使用TimeSlice格式作为列标签
        const label = col <= timeSliceLabels.length ? timeSliceLabels[col-1] : `T${col}`;

        // 绘制列标签，倾斜45度以改善可读性
        draw.text(label)
            .move(col * gridSize + offsetX, offsetY - 75)
            .transform({ rotation: -45 }) // 倾斜45度
            .rotate(-40)
            .font({
                family: 'Arial, sans-serif',
                size: 14, // 较小的字体
                weight: '400',
                anchor: 'end', // 右对齐
                fill: '#34495e' // 标签颜色
            });
    }
}

function drawCircles(draw, csvData, csvSize, csvInfluence, gridSize, offsetX, offsetY) {
    const infoBox = createInfoBox();

    const minSize = d3.min(csvSize.slice(1).flat().filter(d => d !== 0)); // 获取最小值
    const maxSize = d3.max(csvSize.slice(1).flat().filter(d => d !== 0)); // 获取最大值

    // 调整圆的大小比例尺
    const scale = d3.scaleLinear()
        .domain([minSize, maxSize])
        .range([8, 16]); // 适应更大的网格

    // 获取所有影响力值，并处理null和负值
    const influenceValues = csvInfluence.slice(1).flat()
        .map(value => (value === null || value < 0 || value === -1) ? 0 : value + 1); // 加1避免log(0)

    // 计算影响力的最小和最大值
    const minInfluence = d3.min(influenceValues.filter(d => d > 0));
    const maxInfluence = d3.max(influenceValues);

    // 创建log比例尺用于影响力值
    const logScale = d3.scaleLog()
        .domain([minInfluence, maxInfluence])
        .range([0, 1])
        .clamp(true); // 确保输出值在范围内

    // 定义科研友好的颜色方案，与三角形颜色相协调
    // 使用D3的颜色插值器，从低影响力到高影响力
const colorScale = d3.scaleSequential()
    .domain([0, 1])
    .interpolator(d3.interpolateRgbBasis(['#a8dee1', '#75b5dc', '#478ecc', '#326db6', '#2c4ca0', '#313772'])); // 从浅蓝到深蓝，与三角形(#8da0bf)颜色协调
    const rows = csvData.length - 1;
    const cols = csvData[0].length;

    // 用于跟踪已绘制的元素
    const drawnElements = new Set();
    // 存储绘制的圆圈数据，用于后续绘制事件
    const circleDataMap = new Map();

    // 绘制圆圈并添加事件
    for (let row = 1; row <= rows; row++) {
        // 遍历当前行
        for (let col = 0; col < cols; col++) {
            const currentValue = csvData[row][col];

            // 检查当前元素是否是压缩行格式
            if (typeof currentValue === 'string' && currentValue.includes('[')) {
                // 解析压缩行数据 [a, b]
                const values = JSON.parse(currentValue.replace(/'/g, '"'));

                // 为每个值单独绘制
                values.forEach((value, subIndex) => {
                    const subRow = row + subIndex;  // 在不同行绘制
                    const influenceValue = csvInfluence[row][col];
                    // 处理影响力值，确保有效
                    const safeInfluenceValue = (influenceValue === null || influenceValue < 0) ? 0 : influenceValue + 1;

                    const circleInfo = drawSingleCircle(draw, value, col + 1, subRow, csvSize[row][col],
                        safeInfluenceValue, gridSize, offsetX, offsetY, scale, colorScale, logScale,
                        infoBox, drawnElements, csvData[row][col-1]);

                    if (circleInfo) {
                        const key = `${subRow}-${col+1}`;
                        circleDataMap.set(key, circleInfo);
                    }
                });
            } else {
                // 处理单个值的情况
                const influenceValue = csvInfluence[row][col];
                // 处理影响力值，确保有效
                const safeInfluenceValue = (influenceValue === null || influenceValue < 0) ? 0 : influenceValue + 1;

                const circleInfo = drawSingleCircle(draw, currentValue, col + 1, row, csvSize[row][col],
                    safeInfluenceValue, gridSize, offsetX, offsetY, scale, colorScale, logScale,
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
function drawSingleCircle(draw, value, col, row, sizeValue, influenceValue, gridSize, offsetX, offsetY,
                          scale, colorScale, logScale, infoBox, drawnElements, previousValue) {
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

    // 计算影响力颜色值
    let colorValue = 0;
    if (influenceValue > 0) {
        try {
            colorValue = logScale(influenceValue);
        } catch (e) {
            // 处理可能的错误，例如对数为0或负数
            colorValue = 0;
        }
    }

    // 获取圆的填充颜色
    let circleColor = colorScale(colorValue);

    // 创建唯一ID
    const circleId = `C${row}-${timeSlice}-${value}`;

    // 绘制圆的主体
    const circle = draw
        .circle(radius * 2) // 使用直径
        .center(cx, cy)     // 以cx,cy为圆心
        .fill(circleColor)  // 使用新的颜色
        .stroke({ color: '#2c3e50', width: 0.8, opacity: 0.6 }) // 更细的边框
        .attr('id', circleId)
        .attr('cursor', 'pointer'); // 添加鼠标悬停指针样式

    circle.data('community', value);
    circle.data('time-slice', timeLabel[timeSlice-1]);
    circle.data('size', sizeValue);
    circle.data('influence', influenceValue);

    // 添加悬停效果
    circle.on('mouseover', function() {
        this.animate(100).attr({
            'stroke-width': 1.5,
            'stroke-opacity': 1
        });
    }).on('mouseout', function() {
        if (!appState.community || appState.community !== circle.data('community')) {
            this.animate(200).attr({
                'stroke-width': 0.8,
                'stroke-opacity': 0.6
            });
        }
    });

    // 点击事件
    circle.on('click', function () {
        appState.community = circle.data('community');
        appState.timeSlice = circle.data('time-slice');

        // 突出显示选中的圆圈
        d3.selectAll('circle').each(function() {
            const el = d3.select(this);
            if (el.attr('id') === circleId) {
                el.attr('stroke-width', 1.5)
                    .attr('stroke-opacity', 1);
            }
        });

        // 绘制ascore
        d3.selectAll('#link-layer').remove();
        d3.selectAll('#node-layer').remove();
        console.log(appState.community, appState.timeSlice);
        drawNodeLink(appState.community, appState.timeSlice, "agg");
    });

    // 鼠标悬停事件 - 改进信息框样式
    circle.on('mouseover', async function (event) {
        const community = circle.data('community');
        const timeSlice = circle.data('time-slice');

        let comm_data = await d3.csv(`assets/data/${timeSlice}/handle/superNode.csv`)

        let info_data = comm_data[community];
        info_data['Time Slice'] = timeSlice;
        info_data['Influence'] = influenceValue > 1 ? (influenceValue - 1).toFixed(2) : 0; // 减去之前加的1并格式化

        // 改进的信息框样式
        infoBox.style.display = 'block';
        infoBox.style.opacity = 1;
        infoBox.style.backgroundColor = '#ffffff';
        infoBox.style.border = '1px solid #dfe6e9';
        infoBox.style.borderRadius = '6px';
        infoBox.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        infoBox.style.padding = '15px';
        infoBox.style.fontSize = '13px';
        infoBox.style.fontFamily = 'Arial, sans-serif';
        infoBox.style.color = '#2d3436';
        infoBox.style.maxWidth = '280px';
        infoBox.style.zIndex = '1000';
        infoBox.innerHTML = '';

        // 添加标题
        const title = document.createElement('div');
        title.textContent = `Community ${community}`;
        title.style.fontWeight = 'bold';
        title.style.fontSize = '15px';
        title.style.marginBottom = '10px';
        title.style.borderBottom = '1px solid #e0e0e0';
        title.style.paddingBottom = '6px';
        title.style.color = '#2c3e50';
        infoBox.appendChild(title);

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

        // 美化信息行
        Object.entries(filteredData).forEach(([key, value]) => {
            const infoLine = document.createElement('div');
            infoLine.style.display = 'flex';
            infoLine.style.justifyContent = 'space-between';
            infoLine.style.marginBottom = '6px';

            const keySpan = document.createElement('span');
            keySpan.textContent = `${key}:`;
            keySpan.style.fontWeight = '500';
            keySpan.style.color = '#2c3e50';

            const valueSpan = document.createElement('span');
            valueSpan.textContent = value;
            valueSpan.style.marginLeft = '10px';
            valueSpan.style.color = '#34495e';

            infoLine.appendChild(keySpan);
            infoLine.appendChild(valueSpan);
            infoBox.appendChild(infoLine);
        });

        infoBox.style.left = `${event.pageX + 15}px`;
        infoBox.style.top = `${event.pageY + 10}px`;
    });

    // 鼠标移出事件
    circle.on('mouseout', function () {
        infoBox.style.opacity = 0;
        setTimeout(() => {
            infoBox.style.display = 'none';
        }, 200); // 延长淡出时间提升体验
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

    // 科研友好的事件类型颜色 - 更和谐的配色
    const eventColors = {
        line: { stroke: '#5a6d8f', width: 1.3, opacity: 0.75 },
        triangle1: { fill: '#8da0bf', stroke: '#3d4d6b', opacity: 0.8 }, // 第一种三角形（缩小）
        triangle2: { fill: '#8da0bf', stroke: '#3d4d6b', opacity: 0.8 }  // 第二种三角形（增长）
    };

    // 遍历所有行（除了第一行表头）
    for (let row = 1; row <= rows; row++) {
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
                        .stroke({
                            width: eventColors.line.width,
                            color: eventColors.line.stroke,
                            opacity: eventColors.line.opacity
                        })
                        .attr('stroke-linecap', 'round'); // 圆角线帽
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
                            .fill(eventColors.triangle1.fill)
                            .stroke({
                                width: 0.7,
                                color: eventColors.triangle1.stroke,
                                opacity: eventColors.triangle1.opacity
                            });
                    } else if(currentSize < nextSize && ((nextSize - currentSize) / currentSize) > 0.2) {
                        // 下一个节点大于当前节点时，绘制第二个三角形
                        point1 = [nextCircle.cx, nextCircle.cy + nextCircle.radius / 2 * 0.7];
                        point2 = [nextCircle.cx, nextCircle.cy - nextCircle.radius / 2 * 0.7];
                        point3 = [currentCircle.cx, currentCircle.cy];
                        // 绘制三角形
                        draw.polygon([point1, point2, point3])
                            .fill(eventColors.triangle2.fill)
                            .stroke({
                                width: 0.7,
                                color: eventColors.triangle2.stroke,
                                opacity: eventColors.triangle2.opacity
                            });
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
    const radius = size * 1.2; // 增加一点大小以适应更大的网格

    // 创建唯一ID
    const circleId = label;

    // 绘制虚线圆，改进虚线样式
    const circle = draw
        .circle(radius * 2)  // 直径是半径的两倍
        .center(cx, cy)      // 使用center方法让cx,cy表示圆心
        .fill('#a3c9a8')        // 透明填充
        .stroke({
            color: '#a3c9a8', // 与主色系匹配的边框颜色
            width: 1.2,
            // dasharray: '3,2',
            opacity: 1
        })
        .attr('id', circleId)
        .attr('cursor', 'pointer');

    // 添加数据属性
    circle.data('type', 'virtual');
    circle.data('community', label.split('-')[2]);
    const timeLabel = [202401, 202402, 202403, 202404, 202405, 202406, 202407, 202408, 202409, 202410];
    circle.data('time-slice', timeLabel[parseInt(label.split('-')[1])-1]);

    // 添加悬停效果
    circle.on('mouseover', function() {
        this.animate(100).attr({
            'stroke-width': 1.8,
            'stroke-opacity': 1
        });
    }).on('mouseout', function() {
        this.animate(200).attr({
            'stroke-width': 1.2,
            'stroke-opacity': 0.8
        });
    });

    return circle;
}

/**
 * 绘制额外事件连接线和三角形
 * @param {Object} draw - SVG绘图层
 * @param {Array} extraEvents - 额外事件数组，格式为 [[起始节点ID, 目标节点ID, 绘制方法(0/1)], ...]
 * @param {Map} circleDataMap - 存储所有圆圈数据的Map
 */
function drawExtraEvents(draw, extraEvents, circleLayer) {
    if (!extraEvents || extraEvents.length === 0) return;

    // 科研友好的额外事件颜色 - 保持与主事件颜色协调
    const extraEventColors = {
        line: { stroke: '#5a6d8f', width: 1.2, opacity: 0.7, dasharray: '4,3' },
        triangle1: { fill: '#8da0bf', stroke: '#3d4d6b', opacity: 0.7 }, // 第一种三角形
        triangle2: { fill: '#8da0bf', stroke: '#3d4d6b', opacity: 0.7 }  // 第二种三角形
    };

    // 绘制所需的额外虚拟圆
    const extraVirtualCircle = drawExtraCircle(circleLayer, 6, 10, 9, 'C6-10-1', 45, 130, 80);
    drawExtraCircle(circleLayer, 2, 3, 12, 'C2-3-4', 45, 130, 80);

    extraEvents.forEach(event => {
        if (event.length !== 3) {
            console.warn('额外事件格式不正确，应为 [起始节点ID, 目标节点ID, 绘制方法]');
            return;
        }

        const [sourceNodeId, targetNodeId, drawMethod] = event;

        // 使用D3选择器获取ID为sourceNodeId和targetNodeId的圆圈数据
        const sourceCircle = d3.select(`#${sourceNodeId}`);
        const targetCircle = d3.select(`#${targetNodeId}`);

        // 获取圆圈的中心坐标和半径属性
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
                    .fill(extraEventColors.triangle1.fill)
                    .stroke({
                        width: 0.8,
                        color: extraEventColors.triangle1.stroke,
                        opacity: extraEventColors.triangle1.opacity
                    });

            } else if (drawMethod === 1) {
                // 第二种绘制方法：目标节点大于起始节点
                // 计算三角形顶点坐标
                const point1 = [targetCx, targetCy + targetRadius / 2 * 0.7];
                const point2 = [targetCx, targetCy - targetRadius / 2 * 0.7];
                const point3 = [sourceCx, sourceCy];

                // 绘制三角形
                draw.polygon([point1, point2, point3])
                    .fill(extraEventColors.triangle2.fill)
                    .stroke({
                        width: 0.8,
                        color: extraEventColors.triangle2.stroke,
                        opacity: extraEventColors.triangle2.opacity
                    });
            } else {
                // 如果绘制方法不是0或1，则绘制虚线直线
                draw.line(sourceCx, sourceCy, targetCx, targetCy)
                    .stroke({
                        width: extraEventColors.line.width,
                        color: extraEventColors.line.stroke,
                        dasharray: extraEventColors.line.dasharray,
                        opacity: extraEventColors.line.opacity
                    })
                    .attr('stroke-linecap', 'round'); // 圆角线帽
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

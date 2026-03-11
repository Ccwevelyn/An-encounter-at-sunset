import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import betterEchartsMaps from 'better-echarts-maps';
import './ChinaMapPicker.css';

const China = betterEchartsMaps?.China || [];

// 地图数据中的名称 -> 我们使用的省份名称（与 PROVINCES 一致）
const NAME_TO_PROVINCE = {
  '北京': '北京市', '北京市': '北京市',
  '天津': '天津市', '天津市': '天津市',
  '河北': '河北省', '河北省': '河北省',
  '山西': '山西省', '山西省': '山西省',
  '内蒙古': '内蒙古自治区',
  '辽宁': '辽宁省', '辽宁省': '辽宁省',
  '吉林': '吉林省', '吉林省': '吉林省',
  '黑龙江': '黑龙江省', '黑龙江省': '黑龙江省',
  '上海': '上海市', '上海市': '上海市',
  '江苏': '江苏省', '江苏省': '江苏省',
  '浙江': '浙江省', '浙江省': '浙江省',
  '安徽': '安徽省', '安徽省': '安徽省',
  '福建': '福建省', '福建省': '福建省',
  '江西': '江西省', '江西省': '江西省',
  '山东': '山东省', '山东省': '山东省',
  '河南': '河南省', '河南省': '河南省',
  '湖北': '湖北省', '湖北省': '湖北省',
  '湖南': '湖南省', '湖南省': '湖南省',
  '广东': '广东省', '广东省': '广东省',
  '广西': '广西壮族自治区', '广西省': '广西壮族自治区',
  '海南': '海南省', '海南省': '海南省',
  '重庆': '重庆市', '重庆市': '重庆市',
  '四川': '四川省', '四川省': '四川省',
  '贵州': '贵州省', '贵州省': '贵州省',
  '云南': '云南省', '云南省': '云南省',
  '西藏': '西藏自治区',
  '陕西': '陕西省', '陕西省': '陕西省',
  '甘肃': '甘肃省', '甘肃省': '甘肃省',
  '青海': '青海省', '青海省': '青海省',
  '宁夏': '宁夏回族自治区', '宁夏省': '宁夏回族自治区',
  '新疆': '新疆维吾尔自治区',
  '台湾': '台湾省', '台湾省': '台湾省',
  '香港': '香港特别行政区',
  '澳门': '澳门特别行政区',
};

// 我们的省份名 -> 地图中可能的名字（用于高亮，海外无地图）
const PROVINCE_TO_MAP_NAMES = {};
Object.entries(NAME_TO_PROVINCE).forEach(([mapName, prov]) => {
  if (!PROVINCE_TO_MAP_NAMES[prov]) PROVINCE_TO_MAP_NAMES[prov] = [];
  if (!PROVINCE_TO_MAP_NAMES[prov].includes(mapName)) PROVINCE_TO_MAP_NAMES[prov].push(mapName);
});

// 地图外的补充选项（多选时展示为按钮）
const EXTRA_OPTIONS = ['香港特别行政区', '澳门特别行政区', '海外'];

function normalizeName(name) {
  if (!name) return '';
  return NAME_TO_PROVINCE[name] || NAME_TO_PROVINCE[name.replace(/[省市自治区特别行政区]+$/, '')] || name;
}

export default function ChinaMapPicker({ value, onChange, title = '点击地图选择地区', multiple = false }) {
  const chartRef = useRef(null);
  const instanceRef = useRef(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const valueArr = multiple ? (Array.isArray(value) ? value : value ? [value] : []) : [];

  useEffect(() => {
    if (!chartRef.current) return;
    China.forEach(([mapName, geo]) => echarts.registerMap(mapName, geo));
    const chart = echarts.init(chartRef.current, null, { renderer: 'svg' });
    instanceRef.current = chart;

    const option = {
      tooltip: { show: false },
      geo: {
        map: 'china',
        roam: false,
        itemStyle: {
          areaColor: 'rgba(40, 40, 40, 0.9)',
          borderColor: 'rgba(255,255,255,0.25)',
          borderWidth: 1,
        },
        emphasis: {
          itemStyle: {
            areaColor: 'rgba(201, 168, 108, 0.5)',
            borderColor: 'rgba(201, 168, 108, 0.9)',
          },
          label: { show: false },
        },
      },
      series: [{
        type: 'map',
        map: 'china',
        roam: false,
        selectedMode: multiple ? 'multiple' : 'single',
        select: {
          itemStyle: { areaColor: 'rgba(201, 168, 108, 0.6)' },
          label: { show: false },
        },
        itemStyle: {
          areaColor: 'rgba(40, 40, 40, 0.9)',
          borderColor: 'rgba(255,255,255,0.25)',
          borderWidth: 1,
        },
        emphasis: {
          itemStyle: {
            areaColor: 'rgba(201, 168, 108, 0.5)',
            borderColor: 'rgba(201, 168, 108, 0.9)',
          },
          label: { show: false },
        },
      }],
    };
    chart.setOption(option);

    const handler = (params) => {
      if (!params.name) return;
      const province = normalizeName(params.name);
      if (!province) return;
      if (multiple) {
        const current = Array.isArray(valueRef.current) ? valueRef.current : valueRef.current ? [valueRef.current] : [];
        const next = current.includes(province)
          ? current.filter((p) => p !== province)
          : [...current, province];
        onChange(next);
      } else {
        // 单选：再次点击已选省份则取消选择
        const current = valueRef.current;
        onChange(current === province ? '' : province);
      }
    };
    chart.on('click', handler);

    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      chart.off('click', handler);
      chart.dispose();
      instanceRef.current = null;
    };
  }, [onChange, multiple]);

  // 高亮已选：单选用 highlight，多选用 select（先取消再选中当前列表）
  useEffect(() => {
    if (!instanceRef.current) return;
    if (multiple) {
      instanceRef.current.dispatchAction({ type: 'downplay' });
      valueArr.forEach((prov) => {
        const mapNames = PROVINCE_TO_MAP_NAMES[prov];
        if (mapNames && mapNames[0]) {
          instanceRef.current.dispatchAction({ type: 'select', name: mapNames[0] });
        }
      });
    } else if (value) {
      instanceRef.current.dispatchAction({ type: 'downplay' });
      const mapNames = PROVINCE_TO_MAP_NAMES[value];
      if (mapNames && mapNames[0]) {
        instanceRef.current.dispatchAction({ type: 'highlight', name: mapNames[0] });
      }
    } else {
      instanceRef.current.dispatchAction({ type: 'downplay' });
    }
  }, [multiple, value, valueArr]);

  const removeOne = (prov) => {
    if (multiple) onChange(valueArr.filter((p) => p !== prov));
    else onChange('');
  };

  const toggleExtra = (opt) => {
    if (multiple) {
      const next = valueArr.includes(opt) ? valueArr.filter((p) => p !== opt) : [...valueArr, opt];
      onChange(next);
    } else {
      onChange(value === opt ? '' : opt);
    }
  };

  return (
    <div className="china-map-picker">
      {title && <p className="china-map-picker__title">{title}</p>}
      <div ref={chartRef} className="china-map-picker__map" />
      {(multiple ? valueArr.length > 0 : value) && (
        <div className="china-map-picker__selected">
          <span className="china-map-picker__selected-label">已选：</span>
          {multiple ? (
            valueArr.map((prov) => (
              <button
                key={prov}
                type="button"
                className="china-map-picker__chip"
                onClick={() => removeOne(prov)}
                title="点击删除"
              >
                {prov} ×
              </button>
            ))
          ) : (
            <button
              type="button"
              className="china-map-picker__chip"
              onClick={() => removeOne(value)}
              title="点击删除"
            >
              {value} ×
            </button>
          )}
        </div>
      )}
      <div className="china-map-picker__extra">
        {EXTRA_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`china-map-picker__extra-btn ${(multiple ? valueArr.includes(opt) : value === opt) ? 'active' : ''}`}
            onClick={() => toggleExtra(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

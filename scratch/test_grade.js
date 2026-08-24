const removeBracketContents = (str) => {
  if (!str) return '';
  return str.replace(/（[^）]*）/g, "").replace(/\([^)]*\)/g, "").trim();
};

const normalizeChineseString = (str) => {
  let s = removeBracketContents(str)
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?，。？！；：]/g, "")
    .replace(/\s+/g, "");

  // Remove common prefixes
  const prefixes = ["这是", "那是", "它是", "这个是", "那个是", "一个", "是一只", "一个", "一些", "这", "那", "它"];
  let changedPrefix = true;
  while (changedPrefix) {
    changedPrefix = false;
    for (const prefix of prefixes) {
      if (s.startsWith(prefix) && s.length > prefix.length) {
        s = s.substring(prefix.length);
        changedPrefix = true;
      }
    }
  }

  // Remove common suffixes
  const suffixes = ["的", "了", "地", "吧", "呀", "啊", "呢"];
  let changedSuffix = true;
  while (changedSuffix) {
    changedSuffix = false;
    for (const suffix of suffixes) {
      if (s.endsWith(suffix) && s.length > suffix.length) {
        s = s.substring(0, s.length - suffix.length);
        changedSuffix = true;
      }
    }
  }

  // Strip common structural/pronoun fillers to allow flexible syntax
  s = s.replace(/[我在去你他她它们]/g, "");

  const synonymGroups = [
    ["确定", "肯定", "一定", "有把握", "确信"],
    ["脸", "面孔", "面部", "人脸"],
    ["人", "人类", "个人", "个体"],
    ["面具", "面罩"],
    ["公寓", "房屋", "房子", "住宅"],
    ["旧", "老", "破旧"],
    ["暖气", "供暖", "取暖"],
    ["停车场", "车位", "停车位", "泊车場", "泊车"],
    ["自行车", "单车", "脚踏车"],
    ["强烈", "坚定", "坚决", "强力"],
    ["保重", "身体健康", "健康"],
    ["去世", "死", "死亡", "逝世"],
    ["恭喜", "祝贺"],
    ["早日康复", "快点好起来", "早日痊愈"],
    ["旅行", "旅游", "出游"],
    ["冷咖啡", "冰咖啡"],
    ["冰淇淋", "冰激凌", "雪糕"],
    ["散步", "逛街", "走走"],
    ["游泳", "游水"],
    ["干净", "爱干净"]
  ];

  for (const group of synonymGroups) {
    const primary = group[0];
    for (const synonym of group) {
      if (synonym !== primary) {
        s = s.replaceAll(synonym, primary);
      }
    }
  }

  return s;
};

const cleanChinese = (str) => normalizeChineseString(str);

const cleanUser1 = cleanChinese("大象是唯一有四个膝盖的动物");
const cleanUser2 = cleanChinese("大象是唯一有4个膝盖的动物");
const cleanAnswer = cleanChinese("大象是唯一有4个膝盖的动物。");

console.log("cleanUser1 (四个):", cleanUser1);
console.log("cleanUser2 (4个):", cleanUser2);
console.log("cleanAnswer:", cleanAnswer);

console.log("User 1 matches Answer:", cleanUser1 === cleanAnswer);
console.log("User 2 matches Answer:", cleanUser2 === cleanAnswer);

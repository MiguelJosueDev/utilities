
const getFrequencies = text => {
    const frequencies = {};

    text.split('').forEach(char => {
        if (frequencies[char]) {
            frequencies[char] += 1;
        } else {
            frequencies[char] = 1;
        }
    });
    return frequencies;
}

const frequencies = getFrequencies('dsgfdsgfsrdefhgdfgedfklghuiwefuhpwequifhawesjdkiifaniweurp;nhfuiewpanhfiaqwpehbfiwuanfhiaukwjebnifu;pwbfe;iawubnfuiawebf;awuiefawibf')
const transform = Object.entries(frequencies).map(x => ({ char: x[0], f: x[1], left: null, right: null }));

const compare = (a, b) => a.f - b.f;

let orderedObject = transform.sort(compare);

const createNode = (node1, node2) => ({
    char: node1.char + node2.char,
    f: node1.f + node2.f,
    left: node1,
    right: node2,
});

while (orderedObject.length > 1) {
    let node1 = orderedObject.shift();
    let node2 = orderedObject.shift();

    orderedObject.push(createNode(node1, node2));

    orderedObject = orderedObject.sort(compare);
}

console.log('frequencies', JSON.stringify(orderedObject));
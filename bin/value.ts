class Constant {
  value: number;
  constructor(value: number) {
    this.value = value;
  }

  valueOf(): number {
    return this.value;
  }
}

const three = new Constant(3);
console.log(three * 5);

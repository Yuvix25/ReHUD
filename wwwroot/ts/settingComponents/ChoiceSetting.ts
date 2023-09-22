import SettingComponent from "./SettingComponent.js";


export default class ChoiceSetting extends SettingComponent {
    public static readonly elementName = 'choice-setting';

    private _choices: NodeListOf<HTMLButtonElement>;

    private get choices() {
        if (!this._choices) {
            this.loadChoices();
        }
        return this._choices;
    }

    private loadChoices() {
        this._choices = this.querySelectorAll('button');
        this._choices.forEach((choice) => {
            choice.addEventListener('click', () => {
                this.onValueChange(choice.value);
            });
        });
    }

    override connected() {
        requestAnimationFrame(() => {
            this.loadChoices();

            this.initializationDone();
        });
    }

    protected valueChange(val: string) {
        this.value = val;
        this.choices.forEach((choice) => {
            choice.classList.toggle("selected", choice.value === val);
        });
    }
}

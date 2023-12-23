import Hud from "../Hud";
import Action from "../Action.js";
import {IExtendedShared} from "../consts.js";

export type HUDElementOptions = {
    name: string,
    hud?: Hud;
    containerId?: string;
    elementId?: string;
    renderEvery?: number;
};

export class Hide { }
class DelayHide extends Hide {
    public alt: string;
    constructor(alt: string) {
        super();
        this.alt = alt;
    }
}

type WriteableCssProperty = keyof Omit<CSSStyleDeclaration, 'length' | 'parentRule'>;
type StyleObject = {[key in WriteableCssProperty]?: string};

export class Style {
    elementId: string;
    value: string;
    style: StyleObject

    constructor(value: string, style: StyleObject, elementId: string) {
        if (value == undefined)
            throw new Error('`value` cannot be null when using Style');
        if (style == undefined)
            throw new Error('`style` cannot be null when using Style');

        this.elementId = elementId;
        this.value = value;
        this.style = style;
    }

    public applyToElement(element: HTMLElement) {
        for (const [key, value] of Object.entries(this.style) as [WriteableCssProperty, string][]) {
            // @ts-ignore
            element.style[key] = value;
        }
    }

    public equals(other: Style) {
        return this.value === other.value && this.elementId === other.elementId && JSON.stringify(this.style) === JSON.stringify(other.style);
    }
}

export default abstract class HudElement extends Action {
    private readonly containerId: string;
    private readonly elementId: string;

    protected root: HTMLElement | null = null;
    private _isHidden: boolean = false;
    private lastRes: string | Style | null | Hide = null;

    abstract readonly inputKeys: string[];

    private static readonly HIDE = new Hide();

    /**
     * 
     * @param options - Options for the element
     *  - `hud` - The hud instance
     *  - `containerId` - The id of the container element
     *  - `elementId` - The id of the element to render
     *  - `renderEvery` - How often to render the element (in ms)
     */
    constructor(options: HUDElementOptions) {
        super(options.name, options.renderEvery ?? 0);
        this.hud = options.hud;
        this.containerId = options.containerId;
        this.elementId = options.elementId;
    }

    /**
     * Render the element.
     * @param values - Input values of the element + element id (or container id if element id is null)
     * @return
     *  - `string`  - The HTML to render (will be inserted into the element, not the container)
     *  - `_Style`  - The HTML to render, and the style to apply to the element
     *  - `null`    - Render the element as it is
     *  - `_Hide`   - Hides the container, or the element if there is no container
     */
    protected abstract render(...values: any[]): string | Style | null | Hide;

    protected renderWrapper(...values: any[]): string | Style | null | Hide {
        this.root = document.querySelector(':root');

        return this.render(...values);
    }

    public execute(data: IExtendedShared) {
        const res = this.renderWrapper(...this.getInputs(data), this.elementId ?? this.containerId);

        if ((res instanceof Style && this.lastRes instanceof Style && res.equals(this.lastRes))
          || res === this.lastRes) {
            return;
        }
        this.lastRes = res;


        let element = document.getElementById(this.elementId);
        const container = this.containerId == null ? null : document.getElementById(this.containerId);
        let textValue;

        const hide = res instanceof Hide;

        if (res instanceof Style) {
            if (res.elementId != null)
                element = document.getElementById(res.elementId);

            textValue = res.value;
            if (element != null)
                res.applyToElement(element);
        } else if (!hide) {
            textValue = res;
        }

        if (hide) {
            this._isHidden = true;

            if (container != null)
                container.style.display = 'none';
            else if (element != null)
                element.style.display = 'none';
        } else {
            this._isHidden = false;

            if (container != null)
                container.style.display = null;
            else if (element != null)
                element.style.display = null;
        }

        if (!hide && element != null && textValue != null)
            element.innerText = textValue;
    }

    private getInputs(data: any): any[] {
        const values = [];
        for (const valueName of this.inputKeys) {
            if (valueName.startsWith('+')) {
                values.push(data[valueName.slice(1)]);
                continue;
            }
            values.push(data.rawData[valueName]);
        }
        return values;
    }

    protected hide(alt?: string): string | Hide {
        if (!this.hud.isInEditMode()) {
            return HudElement.HIDE;
        }
        return alt;
    }

    protected style(value: string, style: StyleObject, elementId: string = null) {
        return new Style(value, style, elementId);
    };

    public isHidden() {
        return this._isHidden;
    }
}

export abstract class HudElementWithHideDelay extends HudElement {
  private lastShown = -1;
  protected static readonly hideDelay = 1000;

  protected override renderWrapper(...values: any[]): string | Style | null | Hide {
    const res = super.renderWrapper(...values);

    if (!(res instanceof Hide)) {
        this.lastShown = Date.now();
    }
    if (res instanceof DelayHide) {
        return res.alt;
    }
    return res;
  }

  protected override hide(alt?: string): string | Hide {
    if (this.hud.isInEditMode()) {
      return alt;
    }

    if (this.lastShown != -1 && Date.now() - this.lastShown < (this.constructor as any).hideDelay)
      return new DelayHide(alt);

    return super.hide(alt);
  }
}


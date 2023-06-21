import { SpatialCategory, SubCategory } from "@itwin/core-backend";
import { Id64String } from "@itwin/core-bentley";
import { ColorDefProps, SubCategoryAppearance } from "@itwin/core-common";
import { Categories, CategoryColor } from "../Categories";
import { queryDefinitionModel } from "./ConnectorGroupModelService";


export class CategoryDefinitionModel {
    private synchronizer: any;
    private jobSubject: any;
    constructor(synchronizer: any, jobSubject: any) {
        this.synchronizer = synchronizer;
        this.jobSubject = jobSubject;
    }

    insertCategories() {

        const projectDataCategoryId = this.insertCategory(Categories.ProjectData, CategoryColor.Panels);
        const panelCategoryId = this.insertCategory(Categories.Panels, CategoryColor.Panels);
        const mountCategoryId = this.insertCategory(Categories.Mounts, CategoryColor.Mounts);
        const guysCategoryId = this.insertCategory(Categories.Guys, CategoryColor.Guys);
        const attachmentsCategoryId = this.insertCategory(Categories.Attachments, CategoryColor.Attachment);
        const appurtenancesCategoryId = this.insertCategory(Categories.Appurtenances, CategoryColor.Appurtenance);
        const polesCategoryId = this.insertCategory(Categories.Poles, CategoryColor.Poles);

    }

    private insertCategory(name: string, colorDef: ColorDefProps): Id64String {
        const opts: SubCategoryAppearance.Props = {
            // color: colorDef,
        };
        return SpatialCategory.insert(this.synchronizer.imodel, queryDefinitionModel(this.synchronizer, this.jobSubject)!, name, opts);
    }

    private insertSubCategory(categoryId: Id64String, name: string, colorDef: ColorDefProps) {
        const opts: SubCategoryAppearance.Props = {
            // color: colorDef,
        };

        return SubCategory.insert(this.synchronizer.imodel, categoryId, name, opts);
    }
}